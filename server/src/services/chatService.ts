import { getAIProvider } from "../providers/ai";
import { ConversationRepository } from "../repositories/conversationRepository";
import { StudentRepository } from "../repositories/studentRepository";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { Lang } from "../middleware/language";
import { pick } from "../utils/localize";

export class ChatService {
  constructor(
    private ai = getAIProvider(),
    private convoRepo = new ConversationRepository(prisma),
    private studentRepo = new StudentRepository(prisma)
  ) {}

  async getHistory(studentId: string) {
    const conversation = await this.convoRepo.findOrCreateDefault(studentId);
    const messages = await this.convoRepo.listMessages(conversation.id);
    return { conversationId: conversation.id, messages };
  }

  async sendMessage(studentId: string, userMessage: string, lang: Lang) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) throw AppError.notFound("Student topilmadi");

    const conversation = await this.convoRepo.findOrCreateDefault(studentId);
    const history = await this.convoRepo.listMessages(conversation.id);

    await this.convoRepo.addMessage(conversation.id, "USER", userMessage);

    // Recent progress in one plain sentence — keeps AI context compact
    // without leaking raw DB rows into the prompt.
    const recentProgressSummary =
      student.subjectLevels.length > 0
        ? `Kuchli: ${student.subjectLevels
            .filter((s) => s.level === "STRONG")
            .map((s) => s.subject.code)
            .join(", ") || "yo'q"}; Kuchsiz: ${student.subjectLevels
            .filter((s) => s.level === "WEAK")
            .map((s) => s.subject.code)
            .join(", ") || "yo'q"}`
        : "Hali test natijalari yo'q";

    const reply = await this.ai.chat(
      {
        lang,
        studentName: student.user.fullName,
        grade: student.grade,
        interests: student.interests,
        subjectLevels: student.subjectLevels.map((s) => ({
          subjectCode: s.subject.code,
          subjectName: pick(s.subject.nameUz, s.subject.nameRu, lang),
          level: s.level,
          score: s.score,
        })),
        goals: student.goals,
        careerInterests: student.careerInterests,
        recentProgressSummary,
      },
      history.map((h) => ({ role: h.role, content: h.content })),
      userMessage
    );

    await this.convoRepo.addMessage(conversation.id, "ASSISTANT", reply);
    await this.convoRepo.touch(conversation.id);

    return { conversationId: conversation.id, reply };
  }
}
