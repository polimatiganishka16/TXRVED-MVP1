import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const scenario = await prisma.scenario.findUnique({
      where: {
        id: Number(id),
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
  orderBy: {
    orderNo: "asc",
  },
},
      },
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch scenario",
      },
      {
        status: 500,
      }
    );
  }
}
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log(body.questions);
const existingQuestions = await prisma.question.findMany({
  where: {
    scenarioId: Number(id),
  },
  include: {
    options: {
  orderBy: {
    id: "asc",
  },
},
  },
});
const existingOptions = existingQuestions.flatMap(
  (q) => q.options
);
const incomingQuestionIds = body.questions
  .filter((q) => typeof q.id === "number")
  .map((q) => q.id);

const deletedQuestions = existingQuestions.filter(
  (q) => !incomingQuestionIds.includes(q.id)
);
for (const question of deletedQuestions) {
  await prisma.question.delete({
    where: {
      id: question.id,
    },
  });
}
const incomingOptionIds = body.questions
  .flatMap((q) => q.options || [])
  .filter((o) => typeof o.id === "number")
  .map((o) => o.id);

const deletedOptions = existingOptions.filter(
  (o) => !incomingOptionIds.includes(o.id)
);

for (const option of deletedOptions) {
  await prisma.option.delete({
    where: {
      id: option.id,
    },
  });
}
for (const [index, question] of body.questions.entries()) {
  if (typeof question.id === "number") {
    await prisma.question.update({
      where: {
        id: question.id,
      },
      data: {
        questionText: question.text,
        questionType: question.type,
        orderNo: index + 1,
      },
    });
  }
}
for (const question of body.questions) {
  if (!question.options) continue;

  for (const option of question.options) {
    if (typeof option.id === "number") {
      await prisma.option.update({
        where: {
          id: option.id,
        },
        data: {
          optionText: option.text,
          imageUrl: option.imageUrl || null,
        },
      });
    }
  }
}
for (const question of body.questions) {
  if (!question.options) continue;

  for (const option of question.options) {
    if (typeof option.id !== "number") {
      await prisma.option.create({
        data: {
          questionId: question.id,
          optionText: option.text,
          imageUrl: option.imageUrl || null,
        },
      });
    }
  }
}
for (const [index, question] of body.questions.entries()) {
  if (typeof question.id !== "number") {
    await prisma.question.create({
      data: {
        scenarioId: Number(id),
        questionText: question.text,
        questionType: question.type,
        orderNo: index + 1,
      },
    });
  }
}
    const scenario = await prisma.scenario.update({
      where: {
        id: Number(id),
      },
      data: {
  title: body.name,
  description: body.description,
  category: body.category,
  level: body.level,
  icon: body.icon,
},
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to update scenario",
      },
      {
        status: 500,
      }
    );
  }
}
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.scenario.delete({
      where: {
        id: Number(id),
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error: "Scenario not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete scenario",
      },
      {
        status: 500,
      }
    );
  }
}