const nodemailer = require("nodemailer");
require('dotenv').config();

const user = process.env.userMail;
const pass = process.env.userMailPassword;
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user, // Your Gmail account
      pass: pass // Your Gmail App Password
    },
});
const sendMail = async (to, subject, otp, firstName) => {
    try {
        const info = await transporter.sendMail({
            from: '"Pay2friendz" <pay2friendz@gmail.email>', // sender address
            to: to, // list of receivers
            subject: `${subject} Do-not reply`, // Subject line
            text: `Dear ${firstName},\nYour One Time Password (OTP) is ${otp}`, // plain text body
            html: `<p>Dear ${firstName},</p><br/><p>Your One Time Password (OTP) is </p><b>${otp}</b>`, // html body
        });
        return { success: true, messageID: info.messageId };
    } catch (error) {
        return { success: false, error };
    }
}

module.exports = sendMail;