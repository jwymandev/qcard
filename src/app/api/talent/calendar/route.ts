import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

// GET /api/talent/calendar - Get calendar events for the talent
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user and their profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        Profile: true 
      },
    });
    
    if (!user?.Profile) {
      return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
    }
    
    const profileId = user.Profile.id;
    
    // Get all projects the talent is a member of
    const projectMemberships = await prisma.projectMember.findMany({
      where: {
        profileId: profileId,
      },
      include: {
        Project: {
          include: {
            Studio: {
              select: {
                name: true,
              },
            },
            Scene: {
              include: {
                SceneTalent: {
                  where: {
                    profileId: profileId,
                  },
                },
                Location: true,
              },
            },
          },
        },
      },
    });
    
    // Structure the calendar events
    const calendarEvents = [];
    
    // Add project events (overall project timeline)
    for (const membership of projectMemberships) {
      const project = membership.Project;
      
      if (project.startDate || project.endDate) {
        calendarEvents.push({
          id: `project-${project.id}`,
          title: project.title,
          type: 'project',
          start: project.startDate,
          end: project.endDate,
          studio: project.Studio.name,
          role: membership.role || 'Talent',
          status: project.status,
          allDay: true, // Projects are typically all-day events
        });
      }
      
      // Add scene events (specific shooting dates)
      for (const scene of project.Scene) {
        // Only include scenes where the talent is assigned
        if (scene.SceneTalent.length > 0 && scene.shootDate) {
          const sceneTalent = scene.SceneTalent[0]; // There should only be one entry for this talent
          
          calendarEvents.push({
            id: `scene-${scene.id}`,
            title: scene.title,
            type: 'scene',
            start: scene.shootDate,
            // If duration is specified in minutes, calculate end time
            end: scene.duration 
              ? new Date(new Date(scene.shootDate).getTime() + scene.duration * 60 * 1000)
              : scene.shootDate, // Default to the same day if no duration
            projectId: project.id,
            projectTitle: project.title,
            studio: project.Studio.name,
            role: sceneTalent.role || membership.role || 'Talent',
            notes: sceneTalent.notes,
            location: scene.Location ? {
              name: scene.Location.name,
              // Include any other relevant location details
            } : null,
            status: scene.status,
            allDay: scene.duration ? false : true, // All-day if no duration specified
          });
        }
      }
    }
    
    return NextResponse.json(calendarEvents);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json({ 
      error: "Failed to fetch calendar events",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/talent/calendar/export - Generate an ICS file for calendar export
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse the body to get the events to export
    const { events } = await request.json();
    
    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Invalid events data" }, { status: 400 });
    }
    
    // Generate ICS file content
    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//QCard//Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];
    
    // Add each event to the ICS file
    for (const event of events) {
      // Format dates to ICS format (YYYYMMDDTHHmmssZ)
      const formatDate = (date: string | Date) => {
        const d = new Date(date);
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      };
      
      const startDate = formatDate(event.start);
      const endDate = event.end ? formatDate(event.end) : startDate;
      
      // Create a unique ID for the event
      const uid = `${event.id}@qcard.app`;
      
      // Create summary (title)
      const summary = `${event.title} ${event.type === 'scene' ? `(${event.projectTitle})` : ''}`;
      
      // Create description with all relevant details
      let description = `Role: ${event.role}\\n`;
      if (event.studio) description += `Studio: ${event.studio}\\n`;
      if (event.notes) description += `Notes: ${event.notes}\\n`;
      if (event.type === 'scene' && event.projectId) {
        description += `Project: ${event.projectTitle}\\n`;
      }
      
      // Create location if available
      const location = event.location ? event.location.name : '';
      
      // Add event to ICS content
      icsContent = icsContent.concat([
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        location ? `LOCATION:${location}` : '',
        "END:VEVENT"
      ]);
    }
    
    // Close the calendar
    icsContent.push("END:VCALENDAR");
    
    // Filter out empty lines
    const icsFile = icsContent.filter(line => line).join("\r\n");
    
    // Return the ICS file
    return new NextResponse(icsFile, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': 'attachment; filename="qcard-calendar.ics"'
      }
    });
  } catch (error) {
    console.error("Error generating calendar export:", error);
    return NextResponse.json({ 
      error: "Failed to generate calendar export",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}