import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// GET /api/talent/suggested-roles - Get suggested roles based on talent profile
export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Find the user and their profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Profile: {
          include: {
            Skill: true,
            regions: {
              include: {
                region: true
              }
            }
          }
        },
        regionSubscriptions: {
          include: {
            regionPlan: {
              include: {
                region: true
              }
            }
          }
        }
      },
    });
    
    if (!user?.Profile) {
      return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
    }
    
    // Get the user's subscribed regions
    const subscribedRegionIds = user.regionSubscriptions
      .filter(sub => sub.status === 'ACTIVE' || sub.status === 'TRIALING')
      .map(sub => sub.regionPlan.region.id);
    
    if (subscribedRegionIds.length === 0) {
      return NextResponse.json({ 
        message: "No active region subscriptions found. Subscribe to regions to see suggested roles.",
        suggestedRoles: []
      });
    }
    
    // Get all locations in the subscribed regions
    const locationsInRegions = await prisma.location.findMany({
      where: {
        regionId: {
          in: subscribedRegionIds
        }
      },
      select: {
        id: true
      }
    });
    
    const locationIds = locationsInRegions.map(loc => loc.id);
    
    // Get talent profile attributes for matching
    const profile = user.Profile;
    const gender = profile.gender || null;
    const ethnicity = profile.ethnicity || null;
    const height = profile.height || null;
    const skills = profile.Skill?.map(s => s.name.toLowerCase()) || [];
    
    // Calculate age if available
    let age = null;
    if (profile.dateOfBirth) {
      const birthDate = new Date(profile.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    
    // Get all active projects and their talent requirements
    const projects = await prisma.project.findMany({
      where: {
        // Project is not archived and belongs to a studio
        isArchived: false,
        // Filter by a relevant status (not COMPLETED or CANCELLED)
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        },
        // Either has casting calls in the subscribed regions or has talent requirements
        OR: [
          {
            CastingCall: {
              some: {
                locationId: {
                  in: locationIds
                },
                status: 'OPEN'
              }
            }
          },
          {
            talentRequirements: {
              some: {
                isActive: true
              }
            }
          }
        ]
      },
      include: {
        Studio: {
          select: {
            id: true,
            name: true
          }
        },
        CastingCall: {
          where: {
            status: 'OPEN',
            locationId: {
              in: locationIds
            }
          },
          include: {
            Location: true,
            Skill: true
          }
        },
        talentRequirements: {
          where: {
            isActive: true
          }
        }
      }
    });
    
    // Calculate role matches and scores
    const suggestedRoles = [];
    
    for (const project of projects) {
      // Process talent requirements
      for (const requirement of project.talentRequirements) {
        let matchScore = 0;
        const reasons = [];
        
        // Gender match
        if (requirement.gender && gender) {
          if (requirement.gender.toLowerCase() === gender.toLowerCase()) {
            matchScore += 20;
            reasons.push("Gender match");
          }
        } else {
          // No gender requirement or no profile gender (neutral)
          matchScore += 10;
        }
        
        // Age match
        if (age && requirement.minAge && requirement.maxAge) {
          if (age >= parseInt(requirement.minAge) && age <= parseInt(requirement.maxAge)) {
            matchScore += 20;
            reasons.push("Age match");
          }
        } else if (age && requirement.minAge && age >= parseInt(requirement.minAge)) {
          matchScore += 15;
          reasons.push("Above minimum age");
        } else if (age && requirement.maxAge && age <= parseInt(requirement.maxAge)) {
          matchScore += 15;
          reasons.push("Below maximum age");
        } else {
          // No specific age requirement or no profile age (neutral)
          matchScore += 10;
        }
        
        // Ethnicity match
        if (requirement.ethnicity && ethnicity) {
          if (requirement.ethnicity.toLowerCase() === ethnicity.toLowerCase() ||
              requirement.ethnicity.toLowerCase().includes(ethnicity.toLowerCase()) ||
              ethnicity.toLowerCase().includes(requirement.ethnicity.toLowerCase())) {
            matchScore += 15;
            reasons.push("Ethnicity match");
          }
        } else {
          // No ethnicity requirement or no profile ethnicity (neutral)
          matchScore += 5;
        }
        
        // Height match (simplified)
        if (requirement.height && height) {
          matchScore += 10;
          reasons.push("Height considered");
        }
        
        // Skills match
        if (requirement.skills && skills.length > 0) {
          const requiredSkills = requirement.skills.toLowerCase().split(',').map(s => s.trim());
          const matchingSkills = skills.filter(skill => 
            requiredSkills.some(reqSkill => skill.includes(reqSkill) || reqSkill.includes(skill))
          );
          
          if (matchingSkills.length > 0) {
            const skillScore = Math.min(25, matchingSkills.length * 5);
            matchScore += skillScore;
            reasons.push(`${matchingSkills.length} matching skills`);
          }
        }
        
        // Only include roles with a decent match score
        if (matchScore >= 30) {
          suggestedRoles.push({
            id: requirement.id,
            projectId: project.id,
            projectTitle: project.title,
            studioId: project.Studio.id,
            studioName: project.Studio.name,
            role: {
              id: requirement.id,
              title: requirement.title,
              description: requirement.description,
              gender: requirement.gender,
              ageRange: requirement.minAge || requirement.maxAge 
                ? `${requirement.minAge || ''} - ${requirement.maxAge || ''}`
                : null,
              skills: requirement.skills,
              survey: requirement.survey
            },
            matchScore,
            matchReasons: reasons,
            type: 'requirement',
            locations: project.CastingCall.map(call => ({
              id: call.Location?.id,
              name: call.Location?.name
            })).filter((loc, index, self) => 
              loc.id && self.findIndex(l => l.id === loc.id) === index
            )
          });
        }
      }
      
      // Also include active casting calls as potential roles
      for (const castingCall of project.CastingCall) {
        let matchScore = 40; // Base score for open casting calls in subscribed regions
        const reasons = ["In your subscribed region"];
        
        // Skills match if available
        if ('Skill' in castingCall && castingCall.Skill && Array.isArray(castingCall.Skill) && castingCall.Skill.length > 0 && skills.length > 0) {
          const castingSkills = castingCall.Skill.map((s: { name: string }) => s.name.toLowerCase());
          const matchingSkills = skills.filter(skill =>
            castingSkills.some((castSkill: string) => skill.includes(castSkill) || castSkill.includes(skill))
          );
          
          if (matchingSkills.length > 0) {
            const skillScore = Math.min(25, matchingSkills.length * 5);
            matchScore += skillScore;
            reasons.push(`${matchingSkills.length} matching skills`);
          }
        }
        
        suggestedRoles.push({
          id: castingCall.id,
          projectId: project.id,
          projectTitle: project.title,
          studioId: project.Studio.id,
          studioName: project.Studio.name,
          role: {
            id: castingCall.id,
            title: castingCall.title,
            description: castingCall.description,
            requirements: castingCall.requirements
          },
          matchScore,
          matchReasons: reasons,
          type: 'castingCall',
          location: castingCall.Location ? {
            id: castingCall.Location.id,
            name: castingCall.Location.name
          } : null
        });
      }
    }
    
    // Sort by match score (highest first)
    suggestedRoles.sort((a, b) => b.matchScore - a.matchScore);
    
    return NextResponse.json({
      suggestedRoles,
      subscribedRegions: user.regionSubscriptions.map(sub => ({
        id: sub.regionPlan.region.id,
        name: sub.regionPlan.region.name
      }))
    });
  } catch (error) {
    console.error("Error fetching suggested roles:", error);
    return NextResponse.json({ 
      error: "Failed to fetch suggested roles",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}