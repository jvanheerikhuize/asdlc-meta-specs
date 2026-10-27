### What should the system do?

When a user clicks Export, the system shall download the profile as a JSON file.

### Why? What do we know or believe?

GDPR data portability applies to our EU customers.

### Existing facts or assumptions (optional)

FCT-0001

### How will we know it works? (optional)

Given a logged-in user
When they click Export
Then a JSON file is downloaded

Then the file contains only that user's data

### Domain (optional)

privacy

### Priority (optional)

p1

### Category (optional)

data

### Notes (optional)

Coordinate with the DPO before release.
