document.addEventListener("DOMContentLoaded", () => {
let examId = new URLSearchParams(window.location.search).get("exam_id");
const statusMessageEl = document.getElementById("statusMessage");
const quizContentEl = document.getElementById("quizContent");
const examPickerEl = document.getElementById("examPicker");
const availableExamsEl = document.getElementById("availableExams");
const titleEl = document.getElementById("examTitle");
const progressEl = document.getElementById("progress");
const questionEl = document.getElementById("questionText");
const optionsBoxEl = document.getElementById("optionsBox");
const nextBtnEl = document.getElementById("nextBtn");
const prevBtnEl = document.getElementById("prevBtn");
const resultBoxEl = document.getElementById("resultBox");
const timerEl = document.getElementById("timer");
const studentAuthForm = document.getElementById("studentAuthForm");
const authHeadingEl = document.getElementById("authHeading");
const authDescriptionEl = document.getElementById("authDescription");
const authSubmitBtn = document.getElementById("authSubmit");
const authModeToggleBtn = document.getElementById("authModeToggle");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const logoutBtn = document.getElementById("logoutBtn");
const pickerLogoutBtn = document.getElementById("pickerLogoutBtn");

let questions = [];
let currentIndex = 0;
let score = 0;
let selectedOption = null;
let answer =[];
let timerInterval = null;
let secondsRemaining = 0;
let authMode = "login";

function showStatus(message, type) {
  statusMessageEl.textContent = message;
  statusMessageEl.className = `notice${type ? ` ${type}` : ""}`;
}

function showAuthForm() {
  studentAuthForm.classList.remove("hidden");
  quizContentEl.classList.add("hidden");
  examPickerEl.classList.add("hidden");
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  authHeadingEl.textContent = isSignup ? "إنشاء حساب طالب" : "دخول الطالب";
  authDescriptionEl.textContent = isSignup
    ? "أنشئ حسابًا بالبريد الإلكتروني وكلمة المرور للمتابعة."
    : "سجّل الدخول بحسابك للمتابعة وحل الامتحان.";
  authSubmitBtn.textContent = isSignup ? "إنشاء الحساب" : "دخول";
  authModeToggleBtn.textContent = isSignup ? "لديك حساب؟ سجّل الدخول" : "إنشاء حساب جديد";
  document.getElementById("studentPassword").autocomplete = isSignup ? "new-password" : "current-password";
  showStatus("");
}

function updateTimer() {
  if (secondsRemaining <= 0) {
    finishExam();
    return;
  }
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  timerEl.textContent = `الوقت المتبقي: ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  secondsRemaining -= 1;
}

function renderQuestion() {
  selectedOption = null;
  resultBoxEl.textContent = "";
  const question = questions[currentIndex];
  progressEl.textContent = `السؤال ${currentIndex + 1} من ${questions.length}`;
  questionEl.textContent = question.question_text;
  optionsBoxEl.replaceChildren();

  ["a", "b", "c", "d"].forEach((key) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "option-button";
    option.textContent = `${key.toUpperCase()}) ${question[`option_${key}`] || ""}`;
    option.addEventListener("click", () => {
      selectedOption = key;
      optionsBoxEl.querySelectorAll(".option-button").forEach((button) => button.classList.remove("selected"));
      option.classList.add("selected");
    });
    optionsBoxEl.append(option);
  });
  nextBtnEl.textContent = currentIndex === questions.length - 1 ? "إنهاء الامتحان" : "السؤال التالي";
}

async function loadAvailableExams() {
  const { data: exams, error } = await window.supabaseClient
    .from("exams")
    .select("id, title, description, duration_minutes")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load exams for student:", error);
    showStatus(`تعذر تحميل الامتحانات: ${error.message}`, "error");
    return;
  }

  studentAuthForm.classList.add("hidden");
  quizContentEl.classList.add("hidden");
  examPickerEl.classList.remove("hidden");
  availableExamsEl.replaceChildren();
  if (!exams.length) {
    showStatus("لسه مفيش امتحانات");
    return;
  }

  exams.forEach((exam) => {
    const card = document.createElement("article");
    card.className = "exam-card";
    const title = document.createElement("h3");
    title.textContent = exam.title || "امتحان بدون عنوان";
    const description = document.createElement("p");
    description.textContent = exam.description || "اختبر معلوماتك وابدأ الامتحان.";
    const duration = document.createElement("span");
    duration.className = "pill";
    duration.textContent = `${exam.duration_minutes || 0} دقيقة`;
    const start = document.createElement("button");
    start.type = "button";
    start.className = "button";
    start.textContent = "ابدأ الامتحان";
    start.addEventListener("click", async () => {
      examId = exam.id;
      await loadExam();
    });
    card.append(title, description, duration, start);
    availableExamsEl.append(card);
  });
  showStatus("");
}

function finishExam() {
  if (!questions.length || nextBtnEl.disabled) return;
  clearInterval(timerInterval);
  nextBtnEl.disabled = true;
  progressEl.textContent = "";
  questionEl.textContent = "انتهى الامتحان";
  optionsBoxEl.replaceChildren();
  timerEl.textContent = "";
  resultBoxEl.className = "result-score";
  resultBoxEl.textContent = `نتيجتك: ${score} من ${questions.length}`;
  nextBtnEl.textContent = "العودة للامتحانات";
  nextBtnEl.disabled = false;
  nextBtnEl.addEventListener("click", () => { window.location.href = "index.html"; }, { once: true });
}

nextBtnEl.addEventListener("click", () => {
  if (nextBtnEl.textContent === "العودة للامتحانات") {
    window.location.href = "index.html";
    return;
  }
  if (!selectedOption) {
    resultBoxEl.textContent = "اختار إجابة الأول.";
    resultBoxEl.className = "notice error";
    return;
  }
  if (selectedOption === String(questions[currentIndex].correct_option).toLowerCase()) score += 1;
  currentIndex += 1;
  if (currentIndex < questions.length) renderQuestion();
  else finishExam();
});

async function loadExam() {
  if (!examId) {
    showStatus("رابط الامتحان غير مكتمل.", "error");
    return;
  }
  if (!window.supabaseClient) {
    showStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
    return;
  }

  const [{ data: exam, error: examError }, { data: examQuestions, error: questionsError }] = await Promise.all([
    window.supabaseClient.from("exams").select("id, title, duration_minutes").eq("id", examId).maybeSingle(),
    window.supabaseClient.from("questions")
      .select("question_text, option_a, option_b, option_c, option_d, correct_option")
      .eq("exam_id", examId)
      .order("created_at", { ascending: true })
  ]);

  if (examError || questionsError) {
    const error = examError || questionsError;
    console.error("Could not load exam:", error);
    showStatus(`تعذر تحميل الامتحان: ${error.message}`, "error");
    return;
  }
  if (!exam) {
    showStatus("الامتحان غير موجود.");
    return;
  }
  if (!examQuestions.length) {
    showStatus("الامتحان ده لسه مفيهوش أسئلة.");
    return;
  }

  questions = examQuestions;
  titleEl.textContent = exam.title || "امتحان بدون عنوان";
  secondsRemaining = Math.max(0, Number(exam.duration_minutes) || 0) * 60;
  studentAuthForm.classList.add("hidden");
  quizContentEl.classList.remove("hidden");
  showStatus("");
  renderQuestion();
  if (secondsRemaining > 0) {
    updateTimer();
    timerInterval = window.setInterval(updateTimer, 1000);
  } else {
    timerEl.textContent = "بدون مؤقّت";
  }
}

studentAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  console.log(`[student-auth] ${authMode} button clicked`);
  if (window.location.protocol === "file:") {
    showStatus("افتح الموقع عبر localhost أو HTTPS قبل الاتصال بـ Supabase، وليس file://.", "error");
    return;
  }
  if (!window.supabaseClient) {
    showStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
    return;
  }

  const emailInput = document.getElementById("studentEmail");
  const passwordInput = document.getElementById("studentPassword");
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showStatus("اكتب الايميل وكلمة المرور الاول", "error");
    return;
  }
  if (!emailInput.validity.valid) {
    showStatus("اكتب بريدًا إلكترونيًا صحيحًا.", "error");
    return;
  }
  if (password.length < 6) {
    showStatus("كلمة المرور لازم تكون 6 أحرف على الأقل.", "error");
    return;
  }

  authSubmitBtn.disabled = true;
  showStatus(authMode === "signup" ? "جاري إنشاء الحساب..." : "جاري تسجيل الدخول...");

  try {
    const result = authMode === "signup"
      ? await window.supabaseClient.auth.signUp({ email, password })
      : await window.supabaseClient.auth.signInWithPassword({ email, password });

    if (result.error) {
      console.error("Student authentication failed:", result.error);
      showStatus(`تعذر ${authMode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}: ${result.error.message}`, "error");
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      setAuthMode("login");
      emailInput.value = email;
      showStatus("تم إنشاء الحساب. أكّد بريدك الإلكتروني ثم سجّل الدخول.", "success");
      return;
    }

    console.log(`[student-auth] ${authMode} succeeded`);
    logoutBtn.classList.remove("hidden");
    showStatus("تم تسجيل الدخول.", "success");
    if (examId) await loadExam();
    else await loadAvailableExams();
  } catch (error) {
    console.error("Supabase authentication request failed:", error);
    showStatus(`تعذر الاتصال بـ Supabase: ${error.message}`, "error");
  } finally {
    authSubmitBtn.disabled = false;
  }
});

authModeToggleBtn.addEventListener("click", () => {
  console.log("[student-auth] toggle login/signup clicked");
  setAuthMode(authMode === "login" ? "signup" : "login");
});

googleAuthBtn.addEventListener("click", async () => {
  console.log("[student-auth] Google button clicked");
  if (!window.supabaseClient) {
    showStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
    return;
  }
  if (window.location.protocol === "file:") {
    showStatus("دخول Google يحتاج فتح الموقع عبر localhost أو HTTPS، وليس file://.", "error");
    return;
  }
  googleAuthBtn.disabled = true;
  showStatus("جاري فتح تسجيل الدخول باستخدام Google...");
  try {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href }
    });
    if (error) {
      console.error("Google authentication failed:", error);
      showStatus(`تعذر تسجيل الدخول باستخدام Google: ${error.message}`, "error");
    }
  } catch (error) {
    console.error("Google OAuth request failed:", error);
    showStatus(`تعذر بدء تسجيل الدخول باستخدام Google: ${error.message}`, "error");
  } finally {
    googleAuthBtn.disabled = false;
  }
});

async function signOutStudent() {
  const { error } = await window.supabaseClient.auth.signOut();
  if (error) {
    console.error("Student sign-out failed:", error);
    showStatus(`تعذر تسجيل الخروج: ${error.message}`, "error");
    return;
  }
  clearInterval(timerInterval);
  logoutBtn.classList.add("hidden");
  studentAuthForm.reset();
  setAuthMode("login");
  showAuthForm();
  showStatus("تم تسجيل الخروج.");
}

logoutBtn.addEventListener("click", signOutStudent);
pickerLogoutBtn.addEventListener("click", signOutStudent);

if (!window.supabaseClient) {
  setAuthMode("login");
  showAuthForm();
  showStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
} else {
  setAuthMode("login");
  showAuthForm();
  window.supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Could not restore student session:", error);
      showStatus(`تعذر استعادة جلسة الدخول: ${error.message}`, "error");
      return;
    }
    if (!data.session) return;
    logoutBtn.classList.remove("hidden");
    if (examId) loadExam();
    else loadAvailableExams();
  });
}
});
