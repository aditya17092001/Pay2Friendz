const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const sendMail = require('../middlewares/sendMail');
require('dotenv').config();
const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

router.use(session({
    secret: 'pay2friendz', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

const validateEmailAndSendOTP = z.object({
    email: z.string().email(),
    firstName: z.string().min(3)
});

router.post('/signupsendOTP', async (req, res) => {
    try {
        const body = await req.body;
        const { email, firstName } = body;
        console.log(email);
        const parsedBody = validateEmailAndSendOTP.safeParse(req.body);
        if(!parsedBody.success) {
            return res.status(400).json({ msg: "Invalid input", errors: parsedBody.error.errors});
        }
        const existingUser = await prisma.user.findUnique({
            where: {
                email: body.email
            }
        });

        if(existingUser) {
            return res.json({ msg: "User Already exist in our database!" });
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        const mailResponse = await sendMail(email, `OTP for signup`, otp, firstName);
        if(!mailResponse.success) {
            return res.json({ msg: "Something's up with our side, please try again later "});
        }

        req.session.otp = otp+"";
        req.session.email = email;
            
        return res.json({ msg: "OTP sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const validateOTP = z.object({
    email: z.string().email(),
    firstName: z.string().min(3),
    lastName: z.string().min(3),
    password: z.string().min(8),
    date: z.string(),
    month: z.string(),
    year: z.string(),
    otp: z.string().min(6)
});

router.post('/validateOTP', async(req, res) => {
    try {
        const body = await req.body;
        const parsedBody = validateOTP.safeParse(body);
        if(!parsedBody.success) {
            return res.status(400).json({ msg: "Invalid input", errors: parsedBody.error.errors})
        }
        const { email, firstName, lastName, password, date, month, year, otp } = await req.body;
        console.log(req.session.otp+", "+otp);

        if(req.session.otp !== otp) {
            return res.status(400).json({ msg: "Invalid OTP" });
        }
        const dob = new Date(year, month-1, date);
        const currentDate = new Date();
        let age = currentDate.getFullYear() - dob.getFullYear();
        const isBirthdayPassed = currentDate.getMonth() > dob.getMonth() || (currentDate.getMonth() === dob.getMonth() && currentDate.getDate() >= dob.getDate());
            
        if(!isBirthdayPassed) {
            age--;
        }

        if(age < 18) {
            return res.json({ msg: "Your age is under 18 "});
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        const user = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                password: hashedPassword,
                dob
            }
        });
        console.log(user);
        const token = await jwt.sign(user.id, JWT_SECRET);
        req.session.otp = null;
        return res.status(200).json({ 
            msg: "User Created Successfully",
            token
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const signinSendOTP = z.object({
    email: z.string().email(),
    password: z.string().min(8)
})
router.post('/signinsendOTP', async (req, res) => {
    try {
        const body = req.body;
        const parsedBody = signinSendOTP.safeParse(body);
        if(!parsedBody.success) {
            return res.status(400).json({ msg: "Invalid input", errors: parsedBody.error.errors})
        }
    
        const { email, password } = body;
        const user = await prisma.user.findUnique({
            where:{
                email
            } 
        });
    
        const comparedPassword = await bcrypt.compare(password, user.password);
    
        if(!comparedPassword) {
            return res.json({ msg: "Wrong Credentials! "});
        }
    
        const otp = Math.floor(100000 + Math.random() * 900000);
        const mailResponse = await sendMail(email, `OTP for signin`, otp, "User");
        if(!mailResponse.success) {
            return res.json({ msg: "Something's up with our side, please try again later "});
        }
    
        req.session.otp = otp+"";
        req.session.email = email;  
        console.log(user.id);  
        req.session.userid = user.id;
        return res.json({ msg: "OTP sent successfully!" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const validateSinginOTP = z.object({
    otp: z.string().min(6)
})
router.post('/validatesinginOTP', async (req, res) => {
    try {
        const body = req.body;
        const parsedBody = validateSinginOTP.safeParse(body);
        if(!parsedBody.success) {
            return res.status(400).json({ msg: "Invalid input", errors: parsedBody.error.errors});
        }
        console.log(req.session.otp+", "+req.session.email+", "+req.session.id);
        if(req.session.otp === body.otp) {
            const token = await jwt.sign(req.session.userid, JWT_SECRET);
            req.session.otp = null;
            req.session.email = null;
            req.session.userid = null;
            return res.json({ msg: "Success", token });
        } else {
            return res.json({ msg: "Invalid OTP" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;