    const { google } = require("googleapis");

    const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const calendar = google.calendar({
    version: "v3",
    auth
    });