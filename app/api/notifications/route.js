const { PrismaClient } = require('@prisma/client');
const { parseCookies, verifyToken } = require('../../../lib/session');

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const cookieHeader = req.headers.get('cookie');
        const cookies = parseCookies(cookieHeader);
        const token = cookies['iecbp_session'];

        if (!token) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        let payload;
        try {
            payload = verifyToken(token);
        } catch (error) {
            return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        if (new URL(req.url).searchParams.get('unreadCountOnly') === 'true') {
            const unreadCount = await prisma.notification.count({
                where: { userId: payload.id, isRead: false },
            });
            return new Response(JSON.stringify({ unreadCount }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: payload.id },
            orderBy: { createdAt: 'desc' },
        });

        const unreadCount = notifications.filter(n => !n.isRead).length;

        return new Response(JSON.stringify({ notifications, unreadCount }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('GET NOTIFICATIONS ERROR', error);
        return new Response(JSON.stringify({ message: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, title, message } = body;

        if (!userId || !title || !message) {
            return new Response(JSON.stringify({ message: 'userId, title, and message are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const notification = await prisma.notification.create({
            data: {
                userId: Number(userId),
                title,
                message,
                isRead: false,
            },
        });

        return new Response(JSON.stringify(notification), { status: 201, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('CREATE NOTIFICATION ERROR', error);
        return new Response(JSON.stringify({ message: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
