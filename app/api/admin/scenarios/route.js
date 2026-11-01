import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getOrSetCache, invalidateCache } from "../../../../lib/cache";

async function fetchScenarios() {
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
}

export async function GET() {
  try {
    let scenarios = await getOrSetCache("scenarios:active", fetchScenarios, 60 * 60);

    if (!Array.isArray(scenarios)) {
      console.warn("Scenario cache contained an invalid response; refreshing from the database.");
      scenarios = await fetchScenarios();
    }

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

    await invalidateCache("scenarios:active");

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