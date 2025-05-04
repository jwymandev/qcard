# Questionnaire Feature Documentation

## Overview

The Questionnaire feature allows Studio users to create custom forms and gather additional information from Talent profiles beyond what's available in standard profiles. This feature is particularly useful for casting calls, special projects, and pre-screening talent.

## Schema Design

The feature uses the following database models:

### Questionnaire

The main model that represents a set of questions created by a Studio.

```prisma
model Questionnaire {
  id                     String                   @id @default(uuid())
  title                  String                   // Name of the questionnaire
  description            String?                  // Optional description
  studioId               String                   // Which studio created this questionnaire
  isActive               Boolean                  @default(true)  // Whether the questionnaire is active
  requiresApproval       Boolean                  @default(false) // Whether responses need approval
  createdAt              DateTime                 @default(now())
  updatedAt              DateTime                 @updatedAt
  
  // Relationships
  questions              QuestionnaireQuestion[]  // The questions in this questionnaire
  invitations            QuestionnaireInvitation[] // Invitations sent for this questionnaire
  responses              QuestionnaireResponse[]  // Responses to this questionnaire
  Studio                 Studio                   @relation(fields: [studioId], references: [id], onDelete: Cascade)
}
```

### QuestionnaireQuestion

Represents an individual question within a questionnaire.

```prisma
model QuestionnaireQuestion {
  id                     String                @id @default(uuid())
  questionnaireId        String                // Which questionnaire this question belongs to
  text                   String                // The question text
  description            String?               // Optional description or help text
  type                   QuestionType          // Type of question
  isRequired             Boolean               @default(false) // Whether an answer is required
  order                  Int                   // Display order
  options                Json?                 // JSON array of options for choice questions
  metadata               Json?                 // Additional settings (e.g., min/max for ratings)
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  // Relationships
  questionnaire          Questionnaire         @relation(fields: [questionnaireId], references: [id], onDelete: Cascade)
  answers                QuestionAnswer[]      // Answers to this question
}
```

### QuestionnaireInvitation

Represents an invitation sent to a Talent profile to complete a questionnaire.

```prisma
model QuestionnaireInvitation {
  id                     String                @id @default(uuid())
  questionnaireId        String                // Which questionnaire this invitation is for
  profileId              String                // Which talent profile is invited
  status                 String                @default("PENDING") // PENDING, ACCEPTED, DECLINED, COMPLETED
  sentAt                 DateTime              @default(now())
  expiresAt              DateTime?             // Optional expiration date
  completedAt            DateTime?             // When the questionnaire was completed
  message                String?               // Optional message to the talent
  
  // Relationships
  questionnaire          Questionnaire         @relation(fields: [questionnaireId], references: [id], onDelete: Cascade)
  profile                Profile               @relation(fields: [profileId], references: [id], onDelete: Cascade)
  response               QuestionnaireResponse? // The response to this invitation
}
```

### QuestionnaireResponse

Represents a Talent's response to a questionnaire invitation.

```prisma
model QuestionnaireResponse {
  id                     String                @id @default(uuid())
  invitationId           String                @unique // One-to-one with invitation
  questionnaireId        String                // Which questionnaire this response is for
  profileId              String                // Which talent profile submitted this response
  status                 String                @default("SUBMITTED") // SUBMITTED, APPROVED, REJECTED
  submittedAt            DateTime              @default(now())
  reviewedAt             DateTime?             // When the response was reviewed
  reviewNotes            String?               // Optional notes from the reviewer
  
  // Relationships
  invitation             QuestionnaireInvitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  questionnaire          Questionnaire         @relation(fields: [questionnaireId], references: [id], onDelete: Cascade)
  profile                Profile               @relation(fields: [profileId], references: [id], onDelete: Cascade)
  answers                QuestionAnswer[]      // Individual answers in this response
}
```

### QuestionAnswer

Represents an individual answer to a question within a response.

```prisma
model QuestionAnswer {
  id                     String                @id @default(uuid())
  responseId             String                // Which response this answer belongs to
  questionId             String                // Which question this answers
  textValue              String?               // Text answer
  choiceValues           Json?                 // Selected choices (array)
  fileUrl                String?               // URL to uploaded file
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  // Relationships
  response               QuestionnaireResponse @relation(fields: [responseId], references: [id], onDelete: Cascade)
  question               QuestionnaireQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
}
```

## Question Types

The feature supports various question types:

- `SHORT_TEXT`: Short text answer
- `LONG_TEXT`: Multi-line text answer
- `SINGLE_CHOICE`: Single selection from options
- `MULTIPLE_CHOICE`: Multiple selections from options
- `RATING`: Rating scale (e.g., 1-5)
- `DATE`: Date input
- `FILE_UPLOAD`: File upload for documents or images
- `YES_NO`: Yes/No toggle

## User Interface

### For Studio Users

Studio users can:

1. **Create Questionnaires**:
   - Navigate to `/studio/questionnaires` to view all questionnaires
   - Click "New Questionnaire" to create a new one
   - Add questions of various types, with options for multiple-choice questions
   - Set required fields and other question metadata

2. **Send Invitations**:
   - Navigate to a questionnaire and click "Invite Talents"
   - Select talent profiles to invite
   - Add optional messages and expiration dates
   - Send invitations

3. **View Responses**:
   - See which talents have completed questionnaires
   - View detailed responses
   - Approve or reject responses if needed
   - Add feedback or reviewer notes

### For Talent Users

Talent users can:

1. **View Invitations**:
   - Navigate to `/talent/questionnaires` to see all invitations
   - See invitation status (pending, expired, completed)
   - Filter invitations by status

2. **Respond to Questionnaires**:
   - Accept or decline invitations
   - Fill out questionnaire forms with various input types
   - Submit responses once completed
   - View their submitted responses later

## API Routes

The feature includes the following API routes:

### For Studios

- `GET /api/studio/questionnaires`: List all questionnaires for the studio
- `POST /api/studio/questionnaires`: Create a new questionnaire
- `GET /api/studio/questionnaires/[id]`: Get details for a specific questionnaire
- `PUT /api/studio/questionnaires/[id]`: Update a questionnaire
- `DELETE /api/studio/questionnaires/[id]`: Delete a questionnaire
- `POST /api/studio/questionnaires/[id]/invitations`: Send invitations
- `GET /api/studio/questionnaires/[id]/responses`: Get responses for a questionnaire

### For Talents

- `GET /api/talent/questionnaires/invitations`: List all invitations for the talent
- `GET /api/talent/questionnaires/invitations/[id]`: Get details for a specific invitation
- `POST /api/talent/questionnaires/invitations/[id]/accept`: Accept an invitation
- `POST /api/talent/questionnaires/invitations/[id]/decline`: Decline an invitation
- `POST /api/talent/questionnaires/invitations/[id]/respond`: Submit a response
- `GET /api/talent/questionnaires/invitations/[id]/response`: Get a submitted response

## Implementation Notes

1. **Security**: All routes check user authentication and authorization
2. **Validation**: Required questions are validated before submission
3. **File Uploads**: Files are stored securely and linked to responses
4. **Response Status**: Responses can be approved or rejected by studios
5. **Expiration**: Invitations can have expiration dates

## Deployment

To deploy this feature:

1. Run the migration script: `./update-schema-and-migrate.sh`
2. The script will:
   - Update the Prisma schema with questionnaire models
   - Create and apply the database migration
   - Restore temporarily disabled components
   - Verify the build passes with the new schema

3. After running the migration, the feature will be fully functional

## Future Enhancements

Potential future enhancements for the Questionnaire feature:

1. **Templates**: Allow studios to save and reuse questionnaire templates
2. **Analytics**: Add analytics for response rates and completion times
3. **Reminder Notifications**: Send reminders for pending invitations
4. **Bulk Export**: Export all responses to CSV/Excel
5. **More Question Types**: Add support for more complex question types (ranking, matrix, etc.)