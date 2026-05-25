# OpenResume 4-Step Parsing Algorithm

This document provides the full technical reference for the resume parsing algorithm.

## Step 1: Read Text Items from PDF

Extract all text items from the PDF using `pdfjs-dist`. Each text item includes:

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The text content |
| `x1` | number | Left X position |
| `x2` | number | Right X position |
| `y` | number | Y position (from page bottom) |
| `bold` | boolean | Whether the text is bold |
| `newLine` | boolean | Whether this item starts a new line |

X,Y coordinates are relative to the bottom-left corner (origin 0,0).

## Step 2: Group Text Items into Lines

1. **Merge adjacent items** when `Distance = RightTextItem.X₁ - LeftTextItem.X₂` is less than average character width
2. Average character width = total character widths / total character count (exclude bold and newline elements)
3. **Group by Y-coordinate** to form lines (same Y = same line)

This reconstructs the line-by-line reading order that may be lost in PDF extraction.

## Step 3: Group Lines into Sections

### Section Title Detection (primary heuristic — must satisfy ALL 3):

1. It is the only text item in the line
2. It is bolded
3. Its letters are all UPPERCASE

### Fallback Heuristic: Keyword matching

Known section titles: PROFILE, SUMMARY, OBJECTIVE, ABOUT, EDUCATION, ACADEMIC, DEGREES, EXPERIENCE, WORK EXPERIENCE, EMPLOYMENT, PROFESSIONAL EXPERIENCE, SKILLS, TECHNICAL SKILLS, COMPETENCIES, PROJECTS, PORTFOLIO, CERTIFICATIONS, LICENSES, HONORS, AWARDS, VOLUNTEER, COMMUNITY, LEADERSHIP, PUBLICATIONS, RESEARCH, INTERESTS, ACTIVITIES, HOBBIES

- Group all lines under their closest preceding section title
- Lines before any section title go into the PROFILE section

## Step 4: Extract Resume Attributes using Feature Scoring

Each attribute has **feature sets** (matching function + score). Run every text item through all feature sets for an attribute. The text item with the **highest total feature score** is extracted as that attribute.

### Subsection Detection (for Education, Work Experience, etc.)

- **Primary**: vertical line gap > typical line gap × 1.4
- **Fallback**: text item is bolded

### Feature Scoring Tables

#### Name

| Feature | Score |
|---------|-------|
| Contains only letters, spaces or periods | +3 |
| Is bolded | +2 |
| Contains all uppercase letters | +2 |
| Contains @ (may be email) | -4 |
| Contains number (may be phone) | -4 |
| Contains , (may be address) | -4 |
| Contains / (may be URL) | -4 |

#### Email

| Feature | Score |
|---------|-------|
| Matches email regex `\S+@\S+\.\S+` | +5 |
| Contains @ | +2 |

#### Phone

| Feature | Score |
|---------|-------|
| Matches phone regex `\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}` | +5 |

#### Location

| Feature | Score |
|---------|-------|
| Matches city,state regex `[A-Z][a-zA-Z\s]+, [A-Z]{2}` | +5 |

#### URL

| Feature | Score |
|---------|-------|
| Matches URL regex `\S+\.[a-z]+\/\S+` | +5 |

#### School

| Feature | Score |
|---------|-------|
| Contains school keyword (College, University, School, Institute, Academy) | +4 |

#### Degree

| Feature | Score |
|---------|-------|
| Contains degree keyword (Associate, Bachelor, Master, Doctorate, B.S., B.A., M.S., M.A., Ph.D.) | +4 |

#### GPA

| Feature | Score |
|---------|-------|
| Matches GPA regex `[0-4]\.\d{1,2}` | +5 |

## ATS Compatibility Scoring Framework

| Dimension | Weight |
|-----------|--------|
| Name extraction | 20 pts |
| Email extraction | 20 pts |
| Phone extraction | 10 pts |
| Section detection | 15 pts |
| Education parsing | 10 pts |
| Experience parsing | 15 pts |
| Skills parsing | 10 pts |

### Issue Severity Levels

- **CRITICAL**: Name or email cannot be parsed (ATS will likely discard)
- **HIGH**: Key sections missing, dates unparseable, phone not found
- **MEDIUM**: Skills not extracted cleanly, formatting merge issues
- **LOW**: Minor inconsistencies, optional fields missing