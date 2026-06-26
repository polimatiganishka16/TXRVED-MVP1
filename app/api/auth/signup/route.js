const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const resend = require('../../../../lib/resend');

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email: rawEmail } = body;
        const email = (rawEmail || '').trim().toLowerCase();

        if (!name || !email) {
            return new Response(JSON.stringify({ message: 'Full name and email are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // basic validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ message: 'Invalid email' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // duplicate email
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return new Response(JSON.stringify({ message: 'Email already in use' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        const tempPassword = crypto.randomBytes(12).toString('hex');
        const saltRounds = 10;
        const hashed = await bcrypt.hash(tempPassword, saltRounds);

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const user = await prisma.user.create({
            data: {
                name: name || null,
                email,
                password: hashed,
                role: 'CANDIDATE',
                isVerified: false,
                verificationToken: hashedVerificationToken,
                verificationTokenExpiry,
            }
        });

        const candidateCode = `CAND${String(user.id).padStart(4, '0')}`;
        await prisma.candidate.create({
            data: {
                userId: user.id,
                candidate_code: candidateCode,
                name: user.name || "Candidate",
            }
        });

        const displayName = user.name ? user.name : 'there';
        const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/verify?token=${verificationToken}`;
        const subject = 'Verify your IECBP Account';
        const html = `
            <p>Hi ${displayName},</p>
            <p>Thank you for registering with IECBP.</p>
            <p>Your candidate code (username): <strong>${candidateCode}</strong></p>
            <p>Your temporary password: <strong>${tempPassword}</strong></p>
            <p>Please verify your email by clicking the link below:</p>
            <p><a href="${verificationUrl}">Verify your email</a></p>
            <p>This link expires in 24 hours.</p>
            <p>After signing in, please change your password from your profile page.</p>
            <p>If you did not register, you can ignore this email.</p>
        `;

        try {
            await resend.emails.send({
                from: "IECBP <onboarding@resend.dev>",
                to: user.email,
                subject,
                html,
            });
        } catch (err) {
            console.error('RESEND EXCEPTION:', err);
            return new Response(JSON.stringify({ message: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ ok: true, message: 'Registration successful. Please verify your email.' }), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('SIGNUP ERROR', error);
        return new Response(JSON.stringify({ message: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
