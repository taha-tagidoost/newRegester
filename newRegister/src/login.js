/* ====== تنظیمات عمومی ====== */
const TRANSITION_MS = 300; // باید با transition در SCSS هماهنگ باشد (.28s≈300ms)

/* ====== ابزارک‌های سریع ====== */
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

/* ====== ناوبری بین سکشن‌ها ====== */
function fadeToSection(targetSection, cb) {
  if (!targetSection) return;
  const current = getVisibleSection();
  if (current === targetSection) {
    if (typeof cb === "function") cb();
    return;
  }
  if (current) current.classList.remove("is-visible");
  targetSection.classList.add("is-visible");
  window.setTimeout(() => {
    if (typeof cb === "function") cb();
  }, TRANSITION_MS);
}
function showSectionByInnerId(innerId, cb) {
  const sec = getSectionByInnerId(innerId);
  fadeToSection(sec, cb);
}
function showSectionBySectionId(sectionId, cb) {
  const sec = getSectionBySectionId(sectionId);
  fadeToSection(sec, cb);
}
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

/* ====== Helpers ====== */
function toEnglishDigits(str) {
  return (str || "").replace(/[\u06F0-\u06F9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 1728)
  );
}
function sanitizeToDigits(str) {
  str = (str || "").replace(/[^\d\u06F0-\u06F9]/g, "");
  return toEnglishDigits(str);
}
function validateIranMobile(val) {
  if (!val) return { valid: false, msg: "لطفاً شماره موبایل را وارد کنید." };
  val = sanitizeToDigits(val);
  if (val.length !== 11) return { valid: false, msg: "شماره موبایل باید ۱۱ رقم باشد." };
  if (!/^09\d{9}$/.test(val)) return { valid: false, msg: "شماره موبایل معتبر نیست." };
  return { valid: true, msg: "" };
}
const isValidUsername = (v) => /^[A-Za-z0-9._-]{3,32}$/.test((v || "").trim());

/* ====== سیستم واحد مدیریت خطا (برای همهٔ فیلدها، حتی پسورد) ====== */
function getOrCreateErrorP(inputEl) {
  let anchor;

  // برای پسورد: پیام را بعد از .backInputforSearch بگذار
  if (inputEl && inputEl.id === "inputPassword") {
    const wrapper = inputEl.closest(".backInputforSearch");
    if (wrapper) anchor = wrapper;
  }

  // برای بقیه فیلدها یا اگر wrapper نبود
  if (!anchor) {
    const wrapper = inputEl.closest(".backInputforSearch");
    anchor = wrapper || inputEl;
  }

  let p = anchor.nextElementSibling;
  if (!p || !p.classList || !p.classList.contains("field-error")) {
    p = document.createElement("p");
    p.className = "field-error";
    p.setAttribute("role", "alert");
    p.setAttribute("aria-live", "polite");
    anchor.insertAdjacentElement("afterend", p);
  }
  return p;
}

function showError(inputEl, msg) {
  const p = getOrCreateErrorP(inputEl);
  p.textContent = msg || "";
  inputEl.classList.add("invalid");

  // اگر داخل backInputforSearch بود، روی wrapper هم invalid بده
  const wrapper = inputEl.closest(".backInputforSearch");
  if (wrapper) wrapper.classList.add("invalid");
}

function clearError(inputEl) {
  const p = getOrCreateErrorP(inputEl);
  p.textContent = "";
  inputEl.classList.remove("invalid");

  const wrapper = inputEl.closest(".backInputforSearch");
  if (wrapper) wrapper.classList.remove("invalid");
}

/* ====== ورود OTP ====== */
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

/* ====== نمایش/پنهان‌کردن رمز ====== */
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

/* ====== تغییر سکشن ====== */
function showForgetPassword() {
  showSectionBySectionId("forgetPassword", () => {
    const phone = $("#forgetPassword .inputContainer input");
    if (phone) phone.focus();
  });
}

/* ====== رفتار عمومی ====== */
document.addEventListener("DOMContentLoaded", () => {
  // فقط firstLogPage نمایش داده شود
  $$(".loginContainer .login").forEach((s) => s.classList.remove("is-visible"));
  const firstSec = getSectionByInnerId("firstLogPage");
  if (firstSec) {
    firstSec.classList.add("is-visible");
    setActiveTabInSection(firstSec, "firstLogPage");
  }

  // تب‌سوئیچ
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

  // دریافت کد OTP (firstLogPage)
  const getCodeBtn = $("#getCodeBtn");
  if (getCodeBtn) {
    getCodeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const mobileInput = document.querySelector("#firstLogPage .onlyNum");
      if (!mobileInput) return;
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
  const forgot = $(".forgetLink[data-action='forgot']");
  if (forgot) {
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      showForgetPassword();
    });
  }

  // بازگشت با فلش (در صفحات after)
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

  // تغییر متن دکمه فراموشی رمز در صورت نیاز
  const forgetSubmit = $("#forgetPassword .submitCountainer button");
  if (forgetSubmit && forgetSubmit.textContent.trim() === "ورود") {
    forgetSubmit.textContent = "دریافت کد";
  }
});

/* ====== فیلدهای onlyNum: فقط عدد، پاک‌سازی و ولیدیشن بلادرنگ ====== */
document.querySelectorAll(".onlyNum").forEach((input) => {
  input.addEventListener("input", (e) => {
    let val = sanitizeToDigits(e.target.value).slice(0, 11);
    e.target.value = val;
    const check = validateIranMobile(val);
    if (check.valid || val.length === 0) clearError(input);
  });
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    let txt = (e.clipboardData || window.clipboardData).getData("text") || "";
    txt = sanitizeToDigits(txt).slice(0, 11);
    document.execCommand("insertText", false, txt);
  });
  input.addEventListener("keypress", (e) => {
    if (!/[0-9\u06F0-\u06F9]/.test(e.key)) e.preventDefault();
  });
  input.addEventListener("blur", (e) => {
    const val = sanitizeToDigits(e.target.value);
    const { valid, msg } = validateIranMobile(val);
    if (!valid && val.length > 0) showError(input, msg);
    else clearError(input);
  });
});

/* ====== ورود با رمز عبور (secondLogPage) ====== */
(function () {
  const userInput = document.querySelector("#secondLogPage .onlyNum"); // موبایل یا نام کاربری
  const passInput = document.querySelector("#inputPassword");
  const loginBtn  = document.querySelector("#secondLogPage .submitCountainer button");

  if (!userInput || !passInput || !loginBtn) return;

  const MSG_USERNAME_EMPTY = "شماره موبایل یا نام کاربری را وارد کنید.";
  const MSG_USERNAME_INVALID = "فرمت شماره موبایل یا نام کاربری معتبر نیست.";
  const MSG_PASSWORD_EMPTY = "رمز عبور را وارد کنید.";
  const MSG_PASSWORD_SHORT = "رمز عبور باید حداقل ۶ کاراکتر باشد.";

  // blur: نام کاربری/شماره
  userInput.addEventListener("blur", () => {
    const val = (userInput.value || "").trim();
    if (!val) {
      showError(userInput, MSG_USERNAME_EMPTY);
    } else if (!isValidUsername(val) && !validateIranMobile(val).valid) {
      showError(userInput, MSG_USERNAME_INVALID);
    } else {
      clearError(userInput);
    }
  });

  // blur: رمز عبور (پیام بعد از .backInputforSearch می‌نشیند)
  passInput.addEventListener("blur", () => {
    const val = (passInput.value || "").trim();
    if (!val) {
      showError(passInput, MSG_PASSWORD_EMPTY);
    } else if (val.length < 6) {
      showError(passInput, MSG_PASSWORD_SHORT);
    } else {
      clearError(passInput);
    }
  });

  // هنگام تایپ، خطا پاک شود
  userInput.addEventListener("input", () => clearError(userInput));
  passInput.addEventListener("input", () => clearError(passInput));

  // کلیک روی دکمه ورود
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();

    let hasError = false;
    const uVal = (userInput.value || "").trim();
    const pVal = (passInput.value || "").trim();

    if (!uVal) {
      showError(userInput, MSG_USERNAME_EMPTY);
      userInput.focus();
      hasError = true;
    } else if (!isValidUsername(uVal) && !validateIranMobile(uVal).valid) {
      showError(userInput, MSG_USERNAME_INVALID);
      userInput.focus();
      hasError = true;
    } else {
      clearError(userInput);
    }

    if (!pVal) {
      showError(passInput, MSG_PASSWORD_EMPTY);
      if (!hasError) passInput.focus();
      hasError = true;
    } else if (pVal.length < 6) {
      showError(passInput, MSG_PASSWORD_SHORT);
      if (!hasError) passInput.focus();
      hasError = true;
    } else {
      clearError(passInput);
    }

    if (!hasError) {
      console.log("🔐 ورود معتبر:", uVal);
      // TODO: فراخوانی API واقعی لاگین
    }
  });
})();

/* ====== امنیت/پایداری سبک ====== */
const pwdField = document.querySelector("#inputPassword");
if (pwdField) {
  pwdField.addEventListener("paste", (e) => e.preventDefault());
}
document.querySelectorAll(".login .inputContainer").forEach((el) => {
  el.addEventListener("contextmenu", (e) => e.preventDefault());
});

/* ====== ویرایش شماره در OTP: برگشت به firstLogPage ====== */
document.addEventListener("click", (e) => {
  const editItem = e.target.closest("#thirdLogPage .txtItemContainer .item");
  if (!editItem) return;

  const isEdit =
    e.target.closest(".fa-pen-to-square") ||
    editItem.querySelector(".fa-pen-to-square");
  if (!isEdit) return;

  e.preventDefault();

  // پاک‌سازی ورودی‌های OTP
  const otpInputs = document.querySelectorAll("#thirdLogPage .inputsContainer input");
  otpInputs.forEach((inp) => (inp.value = ""));

  // برگشت به firstLogPage
  showSectionByInnerId("firstLogPage", () => {
    const firstSec = getSectionByInnerId("firstLogPage");
    if (firstSec) setActiveTabInSection(firstSec, "firstLogPage");

    const visible = getVisibleSection();
    if (visible && visible !== firstSec) {
      setActiveTabInSection(visible, "firstLogPage");
    }

    const phoneInput = document.querySelector("#firstLogPage .onlyNum");
    if (phoneInput) {
      phoneInput.value = sanitizeToDigits(phoneInput.value).slice(0, 11);
      clearError(phoneInput);
      phoneInput.focus();
      phoneInput.select?.();
    }
  });
});
/* ====== فراموشی رمز: رفتن به صفحهٔ OTP (thirdLogPage) ====== */
const forgetSubmitBtn = $("#forgetPassword .submitCountainer button");
if (forgetSubmitBtn) {
  forgetSubmitBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const mobileInput = $("#forgetPassword .onlyNum");
    if (!mobileInput) return;

    const raw = (mobileInput.value || "").trim();
    const val = sanitizeToDigits(raw);
    const { valid, msg } = validateIranMobile(val);

    if (!valid) {
      showError(mobileInput, msg || "لطفاً شماره موبایل را وارد کنید.");
      mobileInput.focus();
      return;
    }

    // شماره معتبر: خطا پاک و رفتن به صفحه OTP
    clearError(mobileInput);

    showSectionBySectionId("thirdLogPage", () => {
      // فعال‌سازی رفتارهای OTP
      wireOtpInputs();

      // فوکوس روی اولین خانهٔ OTP
      const firstOtp = $("#thirdLogPage .inputsContainer input");
      if (firstOtp) firstOtp.focus();

      // نمایش شماره در متن راهنما
      const phoneTxt = $("#thirdLogPage .txtItemContainer .item:nth-child(2)");
      if (phoneTxt) {
        phoneTxt.textContent = `کد ارسال شده به ${val} را وارد کنید.`;
      }
    });

    // (اختیاری) اینجا درخواست ارسال کد به API بزن
    // fetch("/api/auth/forgot-password", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ mobile: val }),
    // });
  });
}








