import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getOrSetCache } from "../../../../lib/cache";

export async function GET() {
  try {
    const scenarios = await getOrSetCache("scenarios:active", async () => {
      return prisma.scenario.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          icon: true,
          level: true,
          levelColor: true,
          createdAt: true,
          questions: {
            orderBy: { orderNo: "asc" },
            select: {
              id: true,
              questionText: true,
              questionType: true,
              orderNo: true,
              options: {
                orderBy: { id: "asc" },
                select: {
                  id: true,
                  optionText: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }, 60 * 60);

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch scenarios" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const scenario = await prisma.scenario.create({
      data: {
        title: body.name,
        description: body.description,
        category: body.category,
         level: body.level,
         icon: body.icon,
         levelColor: body.levelColor,
        questions: {
          create: body.questions.map((question) => ({
            questionText: question.text,
            questionType: question.type,
            orderNo: question.number,

            options: {
              create: (question.options || []).map((option) => ({
                optionText: option.text || null,
                imageUrl: option.imageUrl || null,
              })),
            },
          })),
        },
      },

      include: {
        questions: {
          include: {
options: {
  orderBy: {
    id: "asc",
  },
},
          },
        },
      },
    });

    return NextResponse.json(scenario, {
      status: 201,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create scenario",
      },
      {
        status: 500,
      }
    );
  }
}