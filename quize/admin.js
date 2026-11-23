const ADMIN_PASSWORD = "Mahmoud@12345";
const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const dashboard = document.getElementById("dashboard");
const adminStatus = document.getElementById("adminStatus");
const examForm = document.getElementById("examForm");
const questionForm = document.getElementById("questionForm");
const adminExamList = document.getElementById("adminExamList");
const adminQuestionList = document.getElementById("adminQuestionList");
const questionExamSelect = document.getElementById("questionExamSelect");
const questionListExamSelect = document.getElementById("questionListExamSelect");
const cancelExamEdit = document.getElementById("cancelExamEdit");
const cancelQuestionEdit = document.getElementById("cancelQuestionEdit");

let exams = [];
let editingExamId = null;
let editingQuestionId = null;

function setStatus(message, type) {
  adminStatus.textContent = message;
  adminStatus.className = `notice${type ? ` ${type}` : ""}`;
}

function setSelectOptions(select, placeholder, selectedValue) {
  select.replaceChildren();
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.append(placeholderOption);
  exams.forEach((exam) => {
    const option = document.createElement("option");
    option.value = exam.id;
    option.textContent = exam.title || "امتحان بدون عنوان";
    select.append(option);
  });
  if (selectedValue && exams.some((exam) => exam.id === selectedValue)) select.value = selectedValue;
}

function renderExams() {
  adminExamList.replaceChildren();
  setSelectOptions(questionExamSelect, "اختار امتحانًا", questionExamSelect.value);
  setSelectOptions(questionListExamSelect, "اختار امتحانًا", questionListExamSelect.value);

  if (!exams.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "لسه مفيش امتحانات. أضف أول امتحان من النموذج.";
    adminExamList.append(empty);
    adminQuestionList.textContent = "";
    return;
  }

  exams.forEach((exam) => {
    const item = document.createElement("article");
    item.className = "admin-exam";
    const title = document.createElement("h3");
    title.textContent = exam.title || "امتحان بدون عنوان";
    const description = document.createElement("p");
    description.textContent = `${exam.duration_minutes || 0} دقيقة${exam.description ? ` - ${exam.description}` : ""}`;
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-small button-secondary";
    edit.textContent = "تعديل";
    edit.dataset.action = "edit-exam";
    edit.dataset.id = exam.id;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-small button-danger";
    remove.textContent = "حذف";
    remove.dataset.action = "delete-exam";
    remove.dataset.id = exam.id;
    actions.append(edit, remove);
    item.append(title, description, actions);
    adminExamList.append(item);
  });
}

function resetExamForm() {
  editingExamId = null;
  examForm.reset();
  document.getElementById("examFormTitle").textContent = "إضافة امتحان";
  examForm.querySelector('button[type="submit"]').textContent = "حفظ الامتحان";
  cancelExamEdit.classList.add("hidden");
}

function resetQuestionForm() {
  editingQuestionId = null;
  questionForm.reset();
  document.getElementById("questionFormTitle").textContent = "إضافة سؤال";
  cancelQuestionEdit.classList.add("hidden");
}

async function loadExams() {
  if (!window.supabaseClient) {
    setStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
    return;
  }
  const { data, error } = await window.supabaseClient
    .from("exams")
    .select("id, title, description, duration_minutes, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load admin exams:", error);
    setStatus(`تعذر تحميل الامتحانات: ${error.message}`, "error");
    return;
  }
  exams = data;
  renderExams();
  await loadQuestions();
}

async function loadQuestions() {
  const examId = questionListExamSelect.value;
  adminQuestionList.replaceChildren();
  if (!examId || !window.supabaseClient) return;

  const { data, error } = await window.supabaseClient
    .from("questions")
    .select("id, exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, created_at")
    .eq("exam_id", examId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Could not load admin questions:", error);
    setStatus(`تعذر تحميل الأسئلة: ${error.message}`, "error");
    return;
  }
  if (!data.length) {
    adminQuestionList.textContent = "لا توجد أسئلة في الامتحان المختار.";
    adminQuestionList.className = "muted";
    return;
  }
  adminQuestionList.className = "";

  data.forEach((question, index) => {
    const item = document.createElement("article");
    item.className = "question-admin";
    const text = document.createElement("strong");
    text.textContent = `${index + 1}. ${question.question_text}`;
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-small button-secondary";
    edit.textContent = "تعديل";
    edit.dataset.action = "edit-question";
    edit.dataset.id = question.id;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button button-small button-danger";
    remove.textContent = "حذف";
    remove.dataset.action = "delete-question";
    remove.dataset.id = question.id;
    actions.append(edit, remove);
    item.append(text, actions);
    adminQuestionList.append(item);
  });
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (document.getElementById("adminPassword").value !== ADMIN_PASSWORD) {
    loginMessage.textContent = "كلمة السر غلط";
    return;
  }
  loginMessage.textContent = "";
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadExams();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  dashboard.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  loginForm.reset();
});

examForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.supabaseClient) return setStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
  const payload = {
    title: document.getElementById("examTitleInput").value.trim(),
    description: document.getElementById("examDescriptionInput").value.trim(),
    duration_minutes: Number(document.getElementById("examDurationInput").value)
  };
  try {
    const query = editingExamId
      ? window.supabaseClient.from("exams").update(payload).eq("id", editingExamId)
      : window.supabaseClient.from("exams").insert(payload);
    const { data: savedExam, error } = await query.select("id").maybeSingle();
    if (error) {
      console.error("Could not save exam:", error);
      setStatus(`تعذر حفظ الامتحان: ${error.message}`, "error");
      return;
    }
    if (!savedExam) {
      setStatus("لم يتم حفظ التعديلات. تحقق من صلاحيات الكتابة في Supabase.", "error");
      return;
    }
    resetExamForm();
    setStatus("تم حفظ الامتحان بنجاح.", "success");
    await loadExams();
  } catch (error) {
    console.error("Exam save request failed:", error);
    setStatus(`تعذر الاتصال بـSupabase لحفظ الامتحان: ${error.message}`, "error");
  }
});

questionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.supabaseClient) return setStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
  const payload = {
    exam_id: questionExamSelect.value,
    question_text: document.getElementById("questionTextInput").value.trim(),
    option_a: document.getElementById("optionAInput").value.trim(),
    option_b: document.getElementById("optionBInput").value.trim(),
    option_c: document.getElementById("optionCInput").value.trim(),
    option_d: document.getElementById("optionDInput").value.trim(),
    correct_option: document.getElementById("correctOptionInput").value
  };
  const query = editingQuestionId
    ? window.supabaseClient.from("questions").update(payload).eq("id", editingQuestionId)
    : window.supabaseClient.from("questions").insert(payload);
  const { error } = await query;
  if (error) {
    console.error("Could not save question:", error);
    setStatus(`تعذر حفظ السؤال: ${error.message}`, "error");
    return;
  }
  const examId = payload.exam_id;
  resetQuestionForm();
  questionListExamSelect.value = examId;
  setStatus("تم حفظ السؤال بنجاح.", "success");
  await loadQuestions();
});

adminExamList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  console.log("Admin exam action clicked:", button.dataset.action, button.dataset.id);
  const exam = exams.find((item) => item.id === button.dataset.id);
  if (!exam) return;
  if (button.dataset.action === "edit-exam") {
    const newTitle = window.prompt("اكتب الاسم الجديد للامتحان:", exam.title || "");
    if (newTitle === null) return;
    const title = newTitle.trim();
    if (!title) {
      setStatus("اسم الامتحان لا يمكن أن يكون فارغًا.", "error");
      return;
    }
    if (!window.supabaseClient) {
      setStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
      return;
    }
    button.disabled = true;
    try {
      const { data: updatedExam, error } = await window.supabaseClient
        .from("exams")
        .update({ title })
        .eq("id", exam.id)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("Could not update exam title:", error);
        setStatus(`تعذر تعديل اسم الامتحان: ${error.message}`, "error");
        return;
      }
      if (!updatedExam) {
        setStatus("لم يتم تعديل الامتحان. تحقق من صلاحيات التعديل في Supabase.", "error");
        return;
      }
      setStatus("تم تعديل اسم الامتحان.", "success");
      await loadExams();
    } catch (error) {
      console.error("Exam title update request failed:", error);
      setStatus(`تعذر الاتصال بـSupabase لتعديل الامتحان: ${error.message}`, "error");
    } finally {
      if (button.isConnected) button.disabled = false;
    }
    return;
  }
  if (button.dataset.action === "delete-exam") {
    if (!window.confirm("هل أنت متأكد من حذف الامتحان وكل أسئلته؟")) return;
    if (!window.supabaseClient) {
      setStatus("راجع إعدادات Supabase في ملف supabase.js.", "error");
      return;
    }
    button.disabled = true;
    setStatus("جاري حذف الامتحان...");
    try {
      const { data: deletedExam, error } = await window.supabaseClient
        .from("exams")
        .delete()
        .eq("id", exam.id)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("Could not delete exam:", error);
        setStatus(`تعذر حذف الامتحان: ${error.message}`, "error");
        return;
      }
      if (!deletedExam) {
        setStatus("لم يتم حذف الامتحان. تحقق من صلاحيات الحذف في Supabase.", "error");
        return;
      }
      if (editingExamId === exam.id) resetExamForm();
      setStatus("تم حذف الامتحان وأسئلته وتحديث القائمة.", "success");
      await loadExams();
    } catch (error) {
      console.error("Exam deletion request failed:", error);
      setStatus(`تعذر الاتصال بـSupabase لحذف الامتحان: ${error.message}`, "error");
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }
});

adminQuestionList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const questionId = button.dataset.id;
  if (button.dataset.action === "edit-question") {
    const { data: question, error } = await window.supabaseClient
      .from("questions")
      .select("id, exam_id, question_text, option_a, option_b, option_c, option_d, correct_option")
      .eq("id", questionId)
      .single();
    if (error) {
      console.error("Could not load question for editing:", error);
      setStatus(`تعذر فتح السؤال للتعديل: ${error.message}`, "error");
      return;
    }
    editingQuestionId = question.id;
    questionExamSelect.value = question.exam_id;
    document.getElementById("questionTextInput").value = question.question_text || "";
    document.getElementById("optionAInput").value = question.option_a || "";
    document.getElementById("optionBInput").value = question.option_b || "";
    document.getElementById("optionCInput").value = question.option_c || "";
    document.getElementById("optionDInput").value = question.option_d || "";
    document.getElementById("correctOptionInput").value = String(question.correct_option || "a").toLowerCase();
    document.getElementById("questionFormTitle").textContent = "تعديل السؤال";
    cancelQuestionEdit.classList.remove("hidden");
    return;
  }
  if (button.dataset.action === "delete-question" && window.confirm("هل أنت متأكد من حذف السؤال؟")) {
    const { error } = await window.supabaseClient.from("questions").delete().eq("id", questionId);
    if (error) {
      console.error("Could not delete question:", error);
      setStatus(`تعذر حذف السؤال: ${error.message}`, "error");
      return;
    }
    setStatus("تم حذف السؤال.", "success");
    await loadQuestions();
  }
});

questionListExamSelect.addEventListener("change", loadQuestions);
cancelExamEdit.addEventListener("click", resetExamForm);
cancelQuestionEdit.addEventListener("click", resetQuestionForm);
