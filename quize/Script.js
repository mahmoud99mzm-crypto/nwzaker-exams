

const examListEl = document.getElementById("examList");
const statusMessageEl = document.getElementById("statusMessage");
const examCountEl = document.getElementById("examCount");

function showStatus(message, type) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `notice${type ? ` ${type}` : ""}`;
}

function makeExamCard(exam, questionCount) {
  const card = document.createElement("article");
  card.className = "exam-card";

  const title = document.createElement("h3");
  title.textContent = exam.title || "امتحان بدون عنوان";
  const description = document.createElement("p");
  description.textContent = exam.description || "ابدأ الامتحان واختبر معلوماتك.";

  const meta = document.createElement("div");
  meta.className = "exam-meta";
  const count = document.createElement("span");
  count.className = "pill";
  count.textContent = `${questionCount} سؤال`;
  const duration = document.createElement("span");
  duration.className = "pill";
  duration.textContent = `${exam.duration_minutes || 0} دقيقة`;
  meta.append(count, duration);

  const start = document.createElement("a");
  start.className = "button";
  start.textContent = "دخول الطالب / ابدأ";
  start.href = `login.html?exam_id=${encodeURIComponent(exam.id)}`;

  card.append(title, description, meta, start);
  return card;
}

async function loadExams() {
  if (!window.supabaseClient) {
    showStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
    return;
  }

  const { data: exams, error } = await window.supabaseClient
    .from("exams")
    .select("id, title, description, duration_minutes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load exams:", error);
    showStatus(`تعذر تحميل الامتحانات: ${error.message}`, "error");
    return;
  }

  examListEl.replaceChildren();
  examCountEl.textContent = exams.length ? `${exams.length} امتحان` : "";
  if (!exams.length) {
    showStatus("لسه مفيش امتحانات");
    return;
  }

  const examIds = exams.map((exam) => exam.id);
  const { data: questions, error: questionsError } = await window.supabaseClient
    .from("questions")
    .select("exam_id")
    .in("exam_id", examIds);

  if (questionsError) {
    console.error("Could not load question counts:", questionsError);
    showStatus(`تم تحميل الامتحانات لكن تعذر تحميل عدد الأسئلة: ${questionsError.message}`, "error");
    return;
  }

  const counts = new Map();
  questions.forEach(({ exam_id: examId }) => counts.set(examId, (counts.get(examId) || 0) + 1));
  exams.forEach((exam) => examListEl.append(makeExamCard(exam, counts.get(exam.id) || 0)));
  showStatus("");
}

loadExams();