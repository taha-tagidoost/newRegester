/* ====== تنظیمات عمومی ====== */
const TRANSITION_MS = 300; // باید با transition در SCSS هماهنگ باشد (.28s≈300ms)

/* ====== ابزارک‌ها ====== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function getVisibleSection() {
  return $(".loginContainer .login.is-visible");
}

function getSectionByInnerId(innerId) {
  const inner = document.getElementById(innerId);
  return inner ? inner.closest("section.login") : null;
}

function getSectionBySectionId(sectionId) {
  return document.getElementById(sectionId);
}

/**
 * کراس‌فید به سکشن مقصد
 * بعد از اتمام ترنزیشن، cb (اختیاری) اجرا می‌شود.
 */
function fadeToSection(targetSection, cb) {
  if (!targetSection) return;
  const current = getVisibleSection();
  if (current === targetSection) {
    if (typeof cb === "function") cb();
    return;
  }
  if (current) current.classList.remove("is-visible");
  targetSection.classList.add("is-visible");

  // پس از اتمام ترنزیشن
  window.setTimeout(() => {
    if (typeof cb === "function") cb();
  }, TRANSITION_MS);
}

/**
 * نمایش سکشن بر اساس inner id (مثل firstLogPage, secondLogPage)
 */
function showSectionByInnerId(innerId, cb) {
  const sec = getSectionByInnerId(innerId);
  fadeToSection(sec, cb);
}

/**
 * نمایش سکشن بر اساس id خود سکشن (مثل thirdLogPage, forgetPassword)
 */
function showSectionBySectionId(sectionId, cb) {
  const sec = getSectionBySectionId(sectionId);
  fadeToSection(sec, cb);
}

/**
 * ست‌کردن active روی تب‌های یک سکشنِ مشخص
 */
function setActiveTabInSection(section, targetInnerId, clickedBtn = null) {
  if (!section) return;
  const tabs = $$('.witchOne button[data-group="register"]', section);
  tabs.forEach((b) => {
    const shouldActive = b.getAttribute("data-target") === targetInnerId;
    b.classList.toggle("active", shouldActive);
  });

  if (clickedBtn) {
    const curSec = clickedBtn.closest("section.login");
    if (curSec) {
      $$('.witchOne button[data-group="register"]', curSec).forEach((b) => {
        b.classList.toggle("active", b === clickedBtn);
      });
    }
  }
}

/* ====== رفتارها ====== */

// OTP: فقط عدد، پرش خودکار، Backspace به قبلی، Paste چندرقمی
function wireOtpInputs() {
  const container = $("#thirdLogPage .inputsContainer");
  if (!container) return;
  const inputs = $$('input[type="text"]', container);
  if (!inputs.length) return;

  inputs.forEach((inp, idx) => {
    inp.setAttribute("inputmode", "numeric");
    inp.setAttribute("autocomplete", "one-time-code");

    inp.addEventListener("beforeinput", (e) => {
      if (e.data && !/^\d$/.test(e.data)) e.preventDefault();
    });

    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
      if (inp.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }
    });

    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].value = "";
      }
      if (e.key === "ArrowLeft" && idx > 0) inputs[idx - 1].focus();
      if (e.key === "ArrowRight" && idx < inputs.length - 1)
        inputs[idx + 1].focus();
    });
  });

  container.addEventListener("paste", (e) => {
    const t = (e.clipboardData || window.clipboardData).getData("text") || "";
    if (!/^\d+$/.test(t)) return;
    e.preventDefault();
    const digits = t.slice(0, inputs.length).split("");
    inputs.forEach((inp, i) => (inp.value = digits[i] || ""));
    (inputs[Math.min(digits.length, inputs.length - 1)] || inputs[0]).focus();
  });
}

// نمایش/پنهان‌کردن رمز
function wirePasswordEye() {
  const pwd = $("#inputPassword");
  const show = $("#showPassword");
  const hide = $("#hidePassword");
  if (!pwd || !show || !hide) return;

  const set = (on) => {
    pwd.type = on ? "text" : "password";
    show.style.display = on ? "none" : "";
    hide.style.display = on ? "" : "none";
  };
  set(false);

  show.addEventListener("click", () => set(true));
  hide.addEventListener("click", () => set(false));
}

// رفتن به سکشن فراموشی رمز
function showForgetPassword() {
  showSectionBySectionId("forgetPassword", () => {
    const phone = $("#forgetPassword .inputContainer input");
    if (phone) phone.focus();
  });
}

/* ====== رویدادها ====== */
document.addEventListener("DOMContentLoaded", () => {
  $$(".loginContainer .login").forEach((s) => s.classList.remove("is-visible"));
  const firstSec = getSectionByInnerId("firstLogPage");
  if (firstSec) {
    firstSec.classList.add("is-visible");
    setActiveTabInSection(firstSec, "firstLogPage");
  }

  // تب‌سوئیچر
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-group="register"][data-target]');
    if (!btn) return;
    const targetInnerId = btn.getAttribute("data-target");
    if (!targetInnerId) return;

    setActiveTabInSection(btn.closest("section.login"), targetInnerId, btn);
    showSectionByInnerId(targetInnerId, () => {
      const destSec = getSectionByInnerId(targetInnerId);
      setActiveTabInSection(destSec, targetInnerId);
    });
  });

  // دکمه «دریافت کد» → بررسی صحت موبایل قبل از مرحله بعد
  const getCodeBtn = $("#getCodeBtn");
  if (getCodeBtn) {
    getCodeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const mobileInput = document.querySelector('#firstLogPage .onlyNum');
      const val = sanitizeToDigits(mobileInput.value);
      const { valid, msg } = validateIranMobile(val);
      if (!valid) {
        showError(mobileInput, msg);
        mobileInput.focus();
        return;
      }
      clearError(mobileInput);
      showSectionBySectionId("thirdLogPage", () => {
        wireOtpInputs();
        const firstOtp = $("#thirdLogPage .inputsContainer input");
        if (firstOtp) firstOtp.focus();
      });
    });
  }

  // فراموشی رمز عبور
  const forgot = $('.forgetLink[data-action="forgot"]');
  if (forgot) {
    forgot.setAttribute("role", "button");
    forgot.setAttribute("tabindex", "0");
    forgot.style.cursor = "pointer";
    const go = (e) => {
      e.preventDefault();
      showForgetPassword();
    };
    forgot.addEventListener("click", go);
    forgot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") go(e);
    });
  }

  // فلش برگشت
  document.addEventListener("click", (e) => {
    if (e.target.closest(".fa-angle-left")) {
      showSectionByInnerId("secondLogPage", () => {
        const sec = getSectionByInnerId("secondLogPage");
        setActiveTabInSection(sec, "secondLogPage");
      });
    }
  });

  // چشم رمز
  wirePasswordEye();

  // متن دکمه‌ی فراموشی
  const forgetSubmit = $("#forgetPassword .submitCountainer button");
  if (forgetSubmit && forgetSubmit.textContent.trim() === "ورود") {
    forgetSubmit.textContent = "دریافت کد";
  }
});

// ===== Helpers =====
function toEnglishDigits(str) {
  return str.replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 1728));
}
function sanitizeToDigits(str) {
  str = str.replace(/[^\d\u06F0-\u06F9]/g, '');
  return toEnglishDigits(str);
}
function validateIranMobile(val) {
  if (!val) return { valid: false, msg: 'لطفاً شماره موبایل را وارد کنید.' };
  if (!/^[09]\d{0,10}$/.test(val)) return { valid: false, msg: 'فقط اعداد و شروع با ۰ یا ۹ مجاز است.' };
  if (val.length !== 11) return { valid: false, msg: 'شماره موبایل باید ۱۱ رقم باشد.' };
  if (!/^09\d{9}$/.test(val)) return { valid: false, msg: 'شماره موبایل معتبر نیست.' };
  return { valid: true, msg: '' };
}
function getOrCreateErrorP(inputEl) {
  let p = inputEl.nextElementSibling;
  if (!p || !p.classList || !p.classList.contains('field-error')) {
    p = document.createElement('p');
    p.className = 'field-error';
    inputEl.parentNode.insertBefore(p, inputEl.nextSibling);
  }
  return p;
}
function showError(inputEl, msg) {
  const p = getOrCreateErrorP(inputEl);
  p.textContent = msg || '';
  inputEl.classList.toggle('invalid', !!msg);
}
function clearError(inputEl) {
  const p = getOrCreateErrorP(inputEl);
  p.textContent = '';
  inputEl.classList.remove('invalid');
}

// فقط عدد مجاز
document.querySelectorAll('.onlyNum').forEach((input) => {
  input.addEventListener('input', (e) => {
    let val = sanitizeToDigits(e.target.value).slice(0, 11);
    e.target.value = val;
    const check = validateIranMobile(val);
    if (check.valid || val.length === 0) clearError(input);
  });
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    let txt = (e.clipboardData || window.clipboardData).getData('text') || '';
    txt = sanitizeToDigits(txt).slice(0, 11);
    document.execCommand('insertText', false, txt);
  });
  input.addEventListener('keypress', (e) => {
    if (!/[0-9\u06F0-\u06F9]/.test(e.key)) e.preventDefault();
  });
  input.addEventListener('blur', (e) => {
    const val = sanitizeToDigits(e.target.value);
    const { valid, msg } = validateIranMobile(val);
    if (!valid && val.length > 0) showError(input, msg);
    else clearError(input);
  });
});

/* =======================================================
   ✅ بخش امنیتی
   ======================================================= */
function sanitizeInputValue(input) {
  const val = input.value;
  const safeVal = val.replace(/[<>]/g, "");
  if (val !== safeVal) input.value = safeVal;
}

function preventDoubleSubmit(button) {
  if (button.disabled) return true;
  button.disabled = true;
  button.classList.add("disabled");
  setTimeout(() => {
    button.disabled = false;
    button.classList.remove("disabled");
  }, 3000);
  return false;
}

const pwdField = document.querySelector("#inputPassword");
if (pwdField) {
  pwdField.addEventListener("paste", (e) => e.preventDefault());
}

document.querySelectorAll(".login .inputContainer").forEach((el) => {
  el.addEventListener("contextmenu", (e) => e.preventDefault());
});
// ===== ویرایش شماره در صفحه‌ی OTP =====
const editNumberBtn = document.querySelector('#thirdLogPage .txtItemContainer .item:nth-child(3)');
if (editNumberBtn) {
  editNumberBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // نمایش صفحه ورود با کد یکبار مصرف
    showSectionByInnerId('firstLogPage', () => {
      const sec = getSectionByInnerId('firstLogPage');
      setActiveTabInSection(sec, 'firstLogPage');

      // فوکوس روی فیلد شماره موبایل
      const phoneInput = document.querySelector('#firstLogPage .onlyNum');
      if (phoneInput) phoneInput.focus();
    });
  });
}
