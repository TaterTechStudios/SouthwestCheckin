1. Setup a scheduler on Claude with the following environment: https://claude.ai/code/routines
2. Custom network access with `*.southwest.com` as the allowed domain
3. Environment variables set up like this:

```
SW_FIRST_NAME=Tater
SW_LAST_NAME=Tech
SW_CONFIRMATION=ABC123
```

4. Set `npx playwright install chromium; curl -o /home/user/southwest-checkin.js https://raw.githubusercontent.com/TaterTechStudios/SouthwestCheckin/refs/heads/main/southwest-checkin.js` as your custom script
5. Add the following description:
```
Run the Southwest Airlines check-in script at /home/user/southwest-checkin.js using Node.js. The env vars SW_CONFIRMATION, SW_FIRST_NAME, and SW_LAST_NAME are already set in the environment. The script uses Playwright with Chromium (installed at /opt/pw-browsers) to navigate to southwest.com and check in. Run it and share any screenshots it produces so I can see the result.
```
6. Add a title, you don't need any connectors
7. Your trigger should be exactly 24 hours prior to your flight time
