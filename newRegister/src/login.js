/* ====== تنظیمات عمومی ====== */
const TRANSITION_MS = 300;

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
  return document.querySelector(`#${CSS.escape(sectionId)}`);
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
  setTimeout(() => typeof cb === "function" && cb(), TRANSITION_MS);
}
function showSectionByInnerId(innerId, cb) {
  fadeToSection(getSectionByInnerId(innerId), cb);
}
function showSectionBySectionId(sectionId, cb) {
  fadeToSection(getSectionBySectionId(sectionId), cb);
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
    curSec &&
      $$('.witchOne button[data-group="register"]', curSec).forEach((b) =>
        b.classList.toggle("active", b === clickedBtn)
      );
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
  if (val.length !== 11)
    return { valid: false, msg: "شماره موبایل باید ۱۱ رقم باشد." };
  if (!/^09\d{9}$/.test(val))
    return { valid: false, msg: "شماره موبایل معتبر نیست." };
  return { valid: true, msg: "" };
}
const isValidUsername = (v) => /^[A-Za-z0-9._-]{3,32}$/.test((v || "").trim());

/* ====== سیستم واحد مدیریت خطا ====== */
function getOrCreateErrorP(inputEl) {
  let anchor;
  if (inputEl && inputEl.id === "inputPassword") {
    const wrapper = inputEl.closest(".backInputforSearch");
    if (wrapper) anchor = wrapper;
  }
  if (!anchor) {
    const wrapper = inputEl.closest(".backInputforSearch");
    anchor = wrapper || inputEl;
  }
  let p = anchor?.nextElementSibling;
  if (!p || !p.classList || !p.classList.contains("field-error")) {
    p = document.createElement("p");
    p.className = "field-error";
    p.setAttribute("role", "alert");
    p.setAttribute("aria-live", "polite");
    anchor?.insertAdjacentElement("afterend", p);
  }
  return p;
}
function showFieldError(inputEl, msg) {
  const p = getOrCreateErrorP(inputEl);
  p.textContent = msg || "";
  inputEl?.classList.add("invalid");
  inputEl?.setAttribute("aria-invalid", "true");
  const wrapper = inputEl?.closest?.(".backInputforSearch");
  if (wrapper) wrapper.classList.add("invalid");
}
function clearFieldError(inputEl) {
  const p = getOrCreateErrorP(inputEl);
  p.textContent = "";
  inputEl?.classList.remove("invalid");
  inputEl?.removeAttribute("aria-invalid");
  const wrapper = inputEl?.closest?.(".backInputforSearch");
  if (wrapper) wrapper.classList.remove("invalid");
}

/* ====== OTP حالت/تایمر ====== */
const otpIntervals = new Map(); // key: sectionId → intervalId
let otpFlow = null; // "login" | "forgot" | null

function stopOtpTimer(sectionId) {
  const id = otpIntervals.get(sectionId);
  if (id) {
    clearInterval(id);
    otpIntervals.delete(sectionId);
  }
}
function resetOtpUI(sectionId) {
  $$(`#${sectionId} .inputsContainer input`).forEach((i) => (i.value = ""));
  const timerEl = $(`#${sectionId} .resendContainer .otpTimer`);
  const expiredEl = $(`#${sectionId} .resendContainer .OTPEXpired`);
  if (timerEl) {
    timerEl.style.display = "block";
    timerEl.textContent = "2:00";
  }
  if (expiredEl) expiredEl.style.display = "none";
}

/* === ست‌کردن مود OTP روی data-submit === */
function setOtpSubmitMode(
  sectionId,
  mode /* 'submit' | 'forgetpassword' | '' */
) {
  const cont = $(`#${sectionId} .inputsContainer`);
  if (cont) {
    if (mode) cont.dataset.submit = mode;
    else delete cont.dataset.submit;
  }
}

function startOtpTimer(sectionId, durationSec = 120) {
  const timerEl = $(`#${sectionId} .resendContainer .otpTimer`);
  const expiredEl = $(`#${sectionId} .resendContainer .OTPEXpired`);
  if (!timerEl || !expiredEl) return;

  stopOtpTimer(sectionId);
  resetOtpUI(sectionId);

  let total = durationSec;
  const render = () => {
    const m = Math.floor(total / 60).toString();
    const s = (total % 60).toString().padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  };
  render();

  const intId = setInterval(() => {
    total--;
    if (total <= 0) {
      stopOtpTimer(sectionId);
      timerEl.style.display = "none";
      expiredEl.style.display = "flex";
      return;
    }
    render();
  }, 1000);

  otpIntervals.set(sectionId, intId);
}
function wireOtpResend(sectionId) {
  const resendBtn = $(`#${sectionId} .OTPEXpired .resendTxt:nth-child(2)`);
  if (!resendBtn || resendBtn.dataset.wired === "1") return;
  resendBtn.dataset.wired = "1";
  resendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // TODO: API ارسال مجدد با توجه به cont.dataset.submit (login/forgot)
    startOtpTimer(sectionId, 120);
    $(`#${sectionId} .inputsContainer input`)?.focus();
  });
}

/* ====== اعتبارسنجی تستی OTP (جایگزین با API واقعی) ====== */
function verifyOtpMock(code) {
  // فعلاً هر کد ۵ رقمی رو معتبر می‌گیره
  return Promise.resolve(/^\d{5}$/.test(code));
}

/* ====== وایرینگ OTP عمومی برای هر سکشن ====== */
function wireOtpForSection(sectionId, { onComplete, verifyFn } = {}) {
  const container = $(`#${sectionId} .inputsContainer`);
  if (!container) return;

  if (container.dataset.wired === "1") {
    startOtpTimer(sectionId, 120);
    wireOtpResend(sectionId);
    return;
  }
  container.dataset.wired = "1";

  const inputs = $$('input[type="text"]', container);
  const K = inputs.length || 5;

  inputs.forEach((inp, idx) => {
    inp.setAttribute("inputmode", "numeric");
    inp.setAttribute("autocomplete", "one-time-code");

    inp.addEventListener("beforeinput", (e) => {
      if (e.data && !/^\d$/.test(e.data)) e.preventDefault();
    });

    inp.addEventListener("input", async () => {
      inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
      if (inp.value && idx < K - 1) {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }
      const code = inputs.map((i) => i.value).join("");
      if (code.length === K && /^[0-9]{5}$/.test(code)) {
        try {
          const ok = verifyFn ? await verifyFn(code) : true;
          if (ok) {
            typeof onComplete === "function" && onComplete(code);
          } else {
            inputs.forEach((i) => (i.value = ""));
            inputs[0].focus();
            alert("کد وارد شده صحیح نیست.");
          }
        } catch {
          alert("خطا در بررسی کد. دوباره تلاش کنید.");
        }
      }
    });

    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].value = "";
      }
      if (e.key === "ArrowLeft" && idx > 0) inputs[idx - 1].focus();
      if (e.key === "ArrowRight" && idx < K - 1) inputs[idx + 1].focus();
    });
  });

  container.addEventListener("paste", (e) => {
    const t = (e.clipboardData || window.clipboardData).getData("text") || "";
    if (!/^\d+$/.test(t)) return;
    e.preventDefault();
    const digits = t.slice(0, K).split("");
    inputs.forEach((inp, i) => (inp.value = digits[i] || ""));
    (inputs[Math.min(digits.length, K - 1)] || inputs[0]).focus();
    const code = inputs.map((i) => i.value).join("");
    if (code.length === K && /^[0-9]{5}$/.test(code)) {
      (verifyFn ? verifyFn(code) : Promise.resolve(true)).then((ok) => {
        if (ok) typeof onComplete === "function" && onComplete(code);
      });
    }
  });

  startOtpTimer(sectionId, 120);
  wireOtpResend(sectionId);
}

/* ====== نمایش/پنهان‌کردن رمز ====== */
function wirePasswordEye() {
  const pwd = $("#inputPassword");
  const show = $("#hidePassword"); // چشم باز: نمایش
  const hide = $("#showPassword"); // چشم خط‌خورده: پنهان
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

/* ====== تغییر سکشن فراموشی ====== */
function showForgetPassword() {
  showSectionBySectionId("forgetPassword", () => {
    stopOtpTimer("newPassword");
    stopOtpTimer("enterNewPassword");
    // پاک‌کردن حالت OTP
    setOtpSubmitMode("newPassword", "");
    const phone = $("#forgetPassword .inputContainer input");
    phone?.focus();
  });
}

/* ====== رفتار عمومی ====== */
document.addEventListener("DOMContentLoaded", () => {
  // شروع: فقط firstLogPage
  $$(".loginContainer .login").forEach((s) => s.classList.remove("is-visible"));
  const firstSec = getSectionByInnerId("firstLogPage");
  firstSec?.classList.add("is-visible");
  firstSec && setActiveTabInSection(firstSec, "firstLogPage");

  // تب‌سوئیچ first/second
  document.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-group="register"][data-target]');
    if (!btn) return;
    const targetInnerId = btn.getAttribute("data-target");
    if (!targetInnerId) return;

    setActiveTabInSection(btn.closest("section.login"), targetInnerId, btn);
    showSectionByInnerId(targetInnerId, () => {
      stopOtpTimer("newPassword");
      stopOtpTimer("enterNewPassword");
      // پاک‌کردن حالت OTP وقتی بین تب‌ها جابجا می‌شیم
      setOtpSubmitMode("newPassword", "");
      const destSec = getSectionByInnerId(targetInnerId);
      setActiveTabInSection(destSec, targetInnerId);
    });
  });

  // دریافت کد از firstLogPage (ورود با کد یکبارمصرف) → OTP
  const getCodeBtn = $("#getCodeBtn");
  if (getCodeBtn) {
    getCodeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const mobileInput = document.querySelector("#firstLogPage .onlyNum");
      if (!mobileInput) return;
      const val = sanitizeToDigits(mobileInput.value);
      const { valid, msg } = validateIranMobile(val);
      if (!valid) {
        showFieldError(mobileInput, msg);
        mobileInput.focus();
        return;
      }
      clearFieldError(mobileInput);

      // جریان ورود با OTP
      otpFlow = "login";

      showSectionBySectionId("newPassword", () => {
        // ست‌کردن مود OTP
        setOtpSubmitMode("newPassword", "submit");

        const phoneTxt = $("#newPassword .txtItemContainer .item:nth-child(2)");
        phoneTxt &&
          (phoneTxt.textContent = `کد ارسال شده به ${val} را وارد کنید.`);

        wireOtpForSection("newPassword", {
          verifyFn: verifyOtpMock,
          onComplete: () => {
            // ✅ در جریان ورود به فرم تعیین رمز نمی‌رویم
            console.log("✅ OTP ورود تایید شد (login flow)");
            // window.location.href = "/dashboard";
          },
        });
      });
    });
  }

  // فراموشی رمز از تب دوم → forgetPassword
  const forgot = $(".forgetLink[data-action='forgot']");
  if (forgot) {
    forgot.addEventListener("click", (e) => {
      e.preventDefault();
      showForgetPassword();
    });
  }

  // آیکن فلش برگشت → بازگشت به secondLogPage
  document.addEventListener("click", (e) => {
    if (e.target.closest(".fa-angle-left")) {
      showSectionByInnerId("secondLogPage", () => {
        stopOtpTimer("newPassword");
        stopOtpTimer("enterNewPassword");
        // پاک‌کردن مود OTP
        setOtpSubmitMode("newPassword", "");
        const sec = getSectionByInnerId("secondLogPage");
        setActiveTabInSection(sec, "secondLogPage");
        otpFlow = null;
      });
    }
  });

  // چشم رمز
  wirePasswordEye();

  // دکمه فراموشی: تغییر متن
  const forgetSubmit = $("#forgetPassword .submitCountainer button");
  if (forgetSubmit && forgetSubmit.textContent.trim() === "ورود") {
    forgetSubmit.textContent = "دریافت کد";
  }
});

/* ====== فیلدهای onlyNum ====== */
document.querySelectorAll(".onlyNum").forEach((input) => {
  input.setAttribute("inputmode", "numeric");
  input.addEventListener("input", (e) => {
    let val = sanitizeToDigits(e.target.value).slice(0, 11);
    e.target.value = val;
    const check = validateIranMobile(val);
    if (check.valid || val.length === 0) clearFieldError(input);
  });
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const txt = sanitizeToDigits(
      (e.clipboardData || window.clipboardData).getData("text") || ""
    ).slice(0, 11);
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.setRangeText(txt, start, end, "end");
  });
  input.addEventListener("keypress", (e) => {
    if (!/[0-9\u06F0-\u06F9]/.test(e.key)) e.preventDefault();
  });
  input.addEventListener("blur", (e) => {
    const val = sanitizeToDigits(e.target.value);
    const { valid, msg } = validateIranMobile(val);
    if (!valid && val.length > 0) showFieldError(input, msg);
    else clearFieldError(input);
  });
});

/* ====== ورود با رمز عبور (secondLogPage) ====== */
(function () {
  const userInput =
    document.querySelector(
      "#secondLogPage #userOrMobile, #secondLogPage .onlyNum"
    ) || document.querySelector("#secondLogPage input[type='text']");
  const passInput = document.querySelector("#inputPassword");
  const loginBtn = document.querySelector(
    "#secondLogPage .submitCountainer button"
  );

  if (!userInput || !passInput || !loginBtn) return;

  const MSG_USERNAME_EMPTY = "شماره موبایل یا نام کاربری را وارد کنید.";
  const MSG_USERNAME_INVALID = "فرمت شماره موبایل یا نام کاربری معتبر نیست.";
  const MSG_PASSWORD_EMPTY = "رمز عبور را وارد کنید.";
  const MSG_PASSWORD_SHORT = "رمز عبور باید حداقل ۶ کاراکتر باشد.";

  userInput.addEventListener("blur", () => {
    const val = (userInput.value || "").trim();
    if (!val) showFieldError(userInput, MSG_USERNAME_EMPTY);
    else if (!isValidUsername(val) && !validateIranMobile(val).valid)
      showFieldError(userInput, MSG_USERNAME_INVALID);
    else clearFieldError(userInput);
  });

  passInput.addEventListener("blur", () => {
    const val = (passInput.value || "").trim();
    if (!val) showFieldError(passInput, MSG_PASSWORD_EMPTY);
    else if (val.length < 6) showFieldError(passInput, MSG_PASSWORD_SHORT);
    else clearFieldError(passInput);
  });

  userInput.addEventListener("input", () => clearFieldError(userInput));
  passInput.addEventListener("input", () => clearFieldError(passInput));

  loginBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    let hasError = false;
    const uVal = (userInput.value || "").trim();
    const pVal = (passInput.value || "").trim();

    if (!uVal) {
      showFieldError(userInput, MSG_USERNAME_EMPTY);
      userInput.focus();
      hasError = true;
    } else if (!isValidUsername(uVal) && !validateIranMobile(uVal).valid) {
      showFieldError(userInput, MSG_USERNAME_INVALID);
      userInput.focus();
      hasError = true;
    } else clearFieldError(userInput);

    if (!pVal) {
      showFieldError(passInput, MSG_PASSWORD_EMPTY);
      if (!hasError) passInput.focus();
      hasError = true;
    } else if (pVal.length < 6) {
      showFieldError(passInput, MSG_PASSWORD_SHORT);
      if (!hasError) passInput.focus();
      hasError = true;
    } else clearFieldError(passInput);

    if (hasError) return;

    // حالت لودینگ
    const backWrapper = passInput.closest(".backInputforSearch");
    loginBtn.disabled = true;
    const oldTxt = loginBtn.textContent;
    loginBtn.textContent = "در حال ورود...";

    try {
      // API واقعی‌ت رو اینجا صدا بزن
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uVal, password: pVal }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "نام کاربری یا رمز عبور نادرست است.");
      }

      // موفق
      clearFieldError(userInput);
      clearFieldError(passInput);
      userInput.classList.remove("invalid");
      passInput.classList.remove("invalid");
      backWrapper?.classList.remove("invalid");

      window.location.href = "/dashboard";
    } catch (err) {
      showFieldError(passInput, err.message);
      passInput.focus();
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = oldTxt;
    }
  });
})();

/* ====== ویرایش شماره در صفحات OTP: برگشت به firstLogPage ====== */
document.addEventListener("click", (e) => {
  const editItem = e.target.closest(
    "#newPassword .txtItemContainer .item, #enterNewPassword .txtItemContainer .item"
  );
  if (!editItem) return;

  const isEdit =
    e.target.closest(".fa-pen-to-square") ||
    editItem.querySelector(".fa-pen-to-square");
  if (!isEdit) return;

  e.preventDefault();

  ["newPassword", "enterNewPassword"].forEach((id) => {
    $$(`#${id} .inputsContainer input`).forEach((i) => (i.value = ""));
    stopOtpTimer(id);
  });
  // پاک‌کردن مود OTP
  setOtpSubmitMode("newPassword", "");

  showSectionByInnerId("firstLogPage", () => {
    const firstSec = getSectionByInnerId("firstLogPage");
    firstSec && setActiveTabInSection(firstSec, "firstLogPage");
    const phoneInput = document.querySelector("#firstLogPage .onlyNum");
    if (phoneInput) {
      phoneInput.value = sanitizeToDigits(phoneInput.value).slice(0, 11);
      clearFieldError(phoneInput);
      phoneInput.focus();
      phoneInput.select?.();
    }
    otpFlow = null;
  });
});

/* ====== فراموشی رمز: forgetPassword → newPassword(OTP) → enterNewPassword ====== */
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
      showFieldError(mobileInput, msg || "لطفاً شماره موبایل را وارد کنید.");
      mobileInput.focus();
      return;
    }

    clearFieldError(mobileInput);

    // جریان فراموشی
    otpFlow = "forgot";

    showSectionBySectionId("newPassword", () => {
      // ست‌کردن مود OTP
      setOtpSubmitMode("newPassword", "forgetpassword");

      const phoneTxt = $("#newPassword .txtItemContainer .item:nth-child(2)");
      phoneTxt &&
        (phoneTxt.textContent = `کد ارسال شده به ${val} را وارد کنید.`);

      wireOtpForSection("newPassword", {
        verifyFn: verifyOtpMock,
        onComplete: () => {
          // ✅ فقط در حالت forgot برو به فرم رمز جدید
          if (otpFlow === "forgot") {
            showSectionBySectionId("enterNewPassword", () => {
              console.log("➡️ انتقال به فرم تعیین رمز جدید");
            });
          }
        },
      });
    });
  });
}

/* ====== بررسی رمز جدید و تکرار آن در enterNewPassword ====== */
(function () {
  const section = document.querySelector("#enterNewPassword");
  if (!section) return;

  const pass1 = section.querySelector("#newPass1");
  const pass2 = section.querySelector("#newPass2");
  const submitBtn = section.querySelector("#confirmNewPassBtn");
  const errorField = section.querySelector(".field-error");

  if (!pass1 || !pass2 || !submitBtn || !errorField) return;

  const showErr = (msg) => {
    errorField.textContent = msg;
    errorField.style.color = "#e53935";
  };
  const clearErr = () => {
    errorField.textContent = "";
  };

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const val1 = (pass1.value || "").trim();
    const val2 = (pass2.value || "").trim();

    if (!val1 || !val2) {
      showErr("لطفاً هر دو فیلد را پر کنید.");
      return;
    }
    if (val1.length < 6) {
      showErr("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (val1 !== val2) {
      showErr("رمزها با هم مطابقت ندارند.");
      return;
    }

    clearErr();

    // ➜ رفتن به صفحه موفقیت
    showSectionBySectionId("passwordChangedSuccessfully", () => {
      stopOtpTimer("newPassword");
      stopOtpTimer("enterNewPassword");
      // پاک‌کردن مود OTP
      setOtpSubmitMode("newPassword", "");
      otpFlow = null;
    });
  });

  [pass1, pass2].forEach((inp) => inp.addEventListener("input", clearErr));
})();

/* ====== از صفحه موفقیت تغییر رمز → ورود با رمز عبور ====== */
document.addEventListener("click", (e) => {
  const successBtn = e.target.closest(
    "#passwordChangedSuccessfully .submitCountainer button"
  );
  if (!successBtn) return;
  e.preventDefault();
  showSectionByInnerId("secondLogPage", () => {
    const sec = getSectionByInnerId("secondLogPage");
    if (sec) setActiveTabInSection(sec, "secondLogPage");
    otpFlow = null;
  });
});

/* ====== رفتن به صفحه ثبت‌نام از لینک‌های 'ثبت نام' (خارج از #singUp) ====== */
document.addEventListener("click", (e) => {
  const regEl = e.target.closest('[data-action="register"]');
  if (!regEl) return;

  // اگر کلیک داخل خود صفحه ثبت‌نام است، نادیده بگیر تا هندلر مخصوصِ برگشت به ورود کار کند
  if (regEl.closest("#singUp")) return;

  e.preventDefault();

  // تمیزکاری حالت‌های قبلی
  stopOtpTimer("newPassword");
  stopOtpTimer("enterNewPassword");
  if (typeof setOtpSubmitMode === "function") {
    setOtpSubmitMode("newPassword", "");
  }

  // نمایش سکشن ثبت‌نام
  showSectionBySectionId("singUp");
});

/* ====== ثبت‌نام: ولیدیشن و ارسال ====== */
(function () {
  const sec = document.getElementById("singUp");
  if (!sec) return;

  // گرفتن فیلدها (بر اساس ترتیب فعلی)
  const [firstName, lastName, phone, refPhone, pass, pass2, captcha] =
    Array.from(sec.querySelectorAll(".inpustSingUpContainer input"));

  // دکمه submit
  const submitBtn =
    sec.querySelector("#signUpSubmit") ||
    sec.querySelector(".submitCountainer button");

  // --- کمک‌تابع‌های ولیدیشن ---
  const isPersianOrLatinName = (v) =>
    /^[\u0600-\u06FFa-zA-Z\s]{2,64}$/.test((v || "").trim());
  const validateRequired = (v) => !!(v && v.trim().length);
  const validatePassword = (v) => (v || "").trim().length >= 6;
  const passwordComplexity = (v) => ({
    hasLetter: /[A-Za-z\u0600-\u06FF]/.test(v || ""),
    hasDigit: /\d/.test(v || "")
  });

  // phone inputs → فقط عدد
  [phone, refPhone].forEach((inp) => {
    if (!inp) return;
    inp.setAttribute("inputmode", "numeric");
    inp.addEventListener("input", (e) => {
      e.target.value = sanitizeToDigits(e.target.value).slice(0, 11);
      const { valid } = validateIranMobile(e.target.value);
      if (valid || e.target.value.length === 0) clearFieldError(inp);
    });
    inp.addEventListener("blur", () => {
      const v = sanitizeToDigits(inp.value);
      if (!v) return clearFieldError(inp);
      const { valid, msg } = validateIranMobile(v);
      if (!valid) showFieldError(inp, msg);
      else clearFieldError(inp);
    });
    inp.addEventListener("keypress", (e) => {
      if (!/[0-9\u06F0-\u06F9]/.test(e.key)) e.preventDefault();
    });
  });

  // type رمزها را اگر text بود، اصلاح کن
  if (pass && pass.type !== "password") pass.type = "password";
  if (pass2 && pass2.type !== "password") pass2.type = "password";

  // نام‌ها
  if (firstName) {
    firstName.addEventListener("blur", () => {
      const v = firstName.value;
      if (!validateRequired(v)) return showFieldError(firstName, "نام را وارد کنید.");
      if (!isPersianOrLatinName(v)) return showFieldError(firstName, "نام معتبر نیست (حداقل ۲ حرف).");
      clearFieldError(firstName);
    });
    firstName.addEventListener("input", () => clearFieldError(firstName));
  }
  if (lastName) {
    lastName.addEventListener("blur", () => {
      const v = lastName.value;
      if (!validateRequired(v)) return showFieldError(lastName, "نام خانوادگی را وارد کنید.");
      if (!isPersianOrLatinName(v)) return showFieldError(lastName, "نام خانوادگی معتبر نیست (حداقل ۲ حرف).");
      clearFieldError(lastName);
    });
    lastName.addEventListener("input", () => clearFieldError(lastName));
  }

  // رمزها
  if (pass) {
    pass.addEventListener("blur", () => {
      const v = pass.value || "";
      if (!validatePassword(v)) return showFieldError(pass, "رمز عبور باید حداقل ۶ کاراکتر باشد.");
      const px = passwordComplexity(v);
      if (!(px.hasLetter && px.hasDigit)) {
        getOrCreateErrorP(pass).textContent = "پیشنهاد: ترکیب حروف و عدد برای امنیت بیشتر.";
      } else {
        clearFieldError(pass);
      }
    });
    pass.addEventListener("input", () => clearFieldError(pass));
  }
  if (pass2) {
    pass2.addEventListener("blur", () => {
      const v1 = pass.value || "";
      const v2 = pass2.value || "";
      if (!validatePassword(v2)) return showFieldError(pass2, "تکرار رمز حداقل ۶ کاراکتر باشد.");
      if (v1 !== v2) return showFieldError(pass2, "رمزها با هم مطابقت ندارند.");
      clearFieldError(pass2);
    });
    pass2.addEventListener("input", () => clearFieldError(pass2));
  }

  // کپچا
  if (captcha) {
    captcha.addEventListener("blur", () => {
      if (!validateRequired(captcha.value)) return showFieldError(captcha, "کد امنیتی را وارد کنید.");
      clearFieldError(captcha);
    });
    captcha.addEventListener("input", () => clearFieldError(captcha));
  }

  // تابع چک کلی
  function validateSignUpAll() {
    let ok = true;

    if (!validateRequired(firstName?.value)) {
      showFieldError(firstName, "نام را وارد کنید."); ok = false;
    } else if (!isPersianOrLatinName(firstName.value)) {
      showFieldError(firstName, "نام معتبر نیست (حداقل ۲ حرف)."); ok = false;
    } else clearFieldError(firstName);

    if (!validateRequired(lastName?.value)) {
      showFieldError(lastName, "نام خانوادگی را وارد کنید."); ok = false;
    } else if (!isPersianOrLatinName(lastName.value)) {
      showFieldError(lastName, "نام خانوادگی معتبر نیست (حداقل ۲ حرف)."); ok = false;
    } else clearFieldError(lastName);

    const pv = sanitizeToDigits(phone?.value || "");
    const pr = sanitizeToDigits(refPhone?.value || "");
    const { valid, msg } = validateIranMobile(pv);
    if (!pv) { showFieldError(phone, "شماره موبایل را وارد کنید."); ok = false; }
    else if (!valid) { showFieldError(phone, msg); ok = false; }
    else clearFieldError(phone);

    if (pr) {
      const checkR = validateIranMobile(pr);
      if (!checkR.valid) { showFieldError(refPhone, checkR.msg); ok = false; }
      else clearFieldError(refPhone);
    } else {
      clearFieldError(refPhone);
    }

    const p1 = pass?.value || "";
    const p2 = pass2?.value || "";
    if (!validatePassword(p1)) { showFieldError(pass, "رمز عبور باید حداقل ۶ کاراکتر باشد."); ok = false; }
    else clearFieldError(pass);
    if (!validatePassword(p2)) { showFieldError(pass2, "تکرار رمز باید حداقل ۶ کاراکتر باشد."); ok = false; }
    else if (p1 !== p2) { showFieldError(pass2, "رمزها با هم مطابقت ندارند."); ok = false; }
    else clearFieldError(pass2);

    if (!validateRequired(captcha?.value)) { showFieldError(captcha, "کد امنیتی را وارد کنید."); ok = false; }
    else clearFieldError(captcha);

    return ok;
  }

  // اگر فرم داری:
  const form = sec.closest("form") || sec.querySelector("form");
  if (form) {
    form.setAttribute("novalidate", "novalidate");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateSignUpAll()) return;

      // ✅ بعد از ثبت‌نام موفق → صفحه موفقیت ثبت‌نام
      showSectionBySectionId("singUpSuccessfully", () => {
        stopOtpTimer("newPassword");
        stopOtpTimer("enterNewPassword");
        setOtpSubmitMode("newPassword", "");
      });
    });
  }

  // اگر فرم نداری و با دکمه submit می‌کنی:
  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!validateSignUpAll()) return;

      // UI لودینگ
      const old = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "در حال ثبت‌نام...";

      try {
        // TODO: API واقعی ثبت‌نام
        // const payload = {...}
        // const res = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
        // if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d?.message || "ثبت‌نام ناموفق بود."); }

        // ✅ موفق → نمایش صفحه موفقیت ثبت‌نام
        showSectionBySectionId("singUpSuccessfully", () => {
          stopOtpTimer("newPassword");
          stopOtpTimer("enterNewPassword");
          setOtpSubmitMode("newPassword", "");
        });

      } catch (err) {
        // خطای کلی را روی کپچا یا پایین دکمه نشان بده
        showFieldError(captcha || phone, err.message || "خطا در ثبت‌نام.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = old;
      }
    });
  }
})();

/* ====== برگشت از صفحه ثبت‌نام به ورود ====== */
document.addEventListener("click", (e) => {
  const loginLink = e.target.closest("#singUp [data-action='register']");
  if (!loginLink) return;

  e.preventDefault();

  // تمیز کردن وضعیت‌ها
  stopOtpTimer("newPassword");
  stopOtpTimer("enterNewPassword");
  if (typeof setOtpSubmitMode === "function") {
    setOtpSubmitMode("newPassword", "");
  }

  // نمایش بخش ورود با رمز عبور
  showSectionByInnerId("secondLogPage", () => {
    const sec = getSectionByInnerId("secondLogPage");
    if (sec) setActiveTabInSection(sec, "secondLogPage");
  });
});

/* ====== از صفحه موفقیت ثبت‌نام → ورود با رمز عبور ====== */
document.addEventListener("click", (e) => {
  const goLogin = e.target.closest("#singUpSuccessfully .submitCountainer button");
  if (!goLogin) return;
  e.preventDefault();
  showSectionByInnerId("secondLogPage", () => {
    const sec = getSectionByInnerId("secondLogPage");
    if (sec) setActiveTabInSection(sec, "secondLogPage");
  });
});
