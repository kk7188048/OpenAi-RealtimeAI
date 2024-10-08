import nodemailer from 'nodemailer';
import { google } from 'googleapis';
// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUR_CLIENT_ID,
  process.env.YOUR_CLIENT_SECRET,
  process.env.YOUR_REDIRECT_URL
);

// Send Google Meet Link
const sendGoogleMeetLink = async (email, date, time, userName) => {
  const meetLink = await generateMeetCode(); // Call async function to generate the meet code

  const mailOptions = {
    from: process.env.GMAIL_USER, // Use the Gmail user from env variable
    to: email,
    subject: 'Your Appointment Confirmation',
    text: `Dear ${userName},\n\nYour appointment is confirmed for ${date} at ${time}.\nJoin the meeting using this link: ${meetLink}\n\nBest regards,\nYour Appointment Assistant`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    speak(`An email with the Google Meet link has been sent to ${email}.`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Generate a unique Google Meet code
const generateMeetCode = async () => {
  try {
    // Authenticate the client
    const accessToken = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: 'Google Meet Meeting',
        start: {
          dateTime: new Date().toISOString(),
          timeZone: 'Asia/Kolkata', // Adjust timezone as needed
        },
        end: {
          dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          timeZone: 'Asia/Kolkata',
        },
        conferenceData: {
          createRequest: {
            requestId: 'myUniqueRequestId', // Ensure this ID is unique for every request
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      },
      conferenceDataVersion: 1, // Required for conference data
    });

    const meetLink = response.data.hangoutsMeetLink;
    return meetLink; // Return the generated link
  } catch (error) {
    console.error('Error generating Google Meet link:', error);
    throw new Error('Failed to generate Google Meet link'); // Propagate error
  }
};

// Example usage of sendGoogleMeetLink
const exampleUsage = async () => {
  const email = 'recipient@example.com';
  const date = '2024-10-08'; // Replace with actual date
  const time = '10:00 AM'; // Replace with actual time
  const userName = 'John Doe'; // Replace with actual user name

  await sendGoogleMeetLink(email, date, time, userName);
};

exampleUsage();


export default sendGoogleMeetLink;
