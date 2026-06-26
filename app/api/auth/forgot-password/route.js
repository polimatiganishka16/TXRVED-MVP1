const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const resend = require('../../../../lib/resend');

const prisma = new PrismaClient();

export async function POST(req) {
    try {
        const body = await req.json();
        const { email: rawEmail } = body;
        const email = (rawEmail || '').trim().toLowerCase();

        if (!email) {
            return new Response(JSON.stringify({ message: 'Email is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return new Response(JSON.stringify({ message: 'If an account exists with this email, a reset link will be sent.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedResetToken,
                resetTokenExpiry,
            }
        });

        const displayName = user.name ? user.name : 'there';
        const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;
        const subject = 'Reset your IECBP Password';
        const html = `
            <p>Hi ${displayName},</p>
            <p>You requested to reset your password for your IECBP account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}">Reset your password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you did not request a password reset, you can ignore this email.</p>
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

        return new Response(JSON.stringify({ ok: true, message: 'If an account exists with this email, a reset link will be sent.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('FORGOT PASSWORD ERROR', error);
        return new Response(JSON.stringify({ message: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
