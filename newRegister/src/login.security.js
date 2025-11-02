/* =======================================================
   🔒 Security Layer for login pages
   مکمل login.js
   ======================================================= */

/**
 * جلوگیری از تزریق HTML یا اسکریپت در ورودی‌ها
 */
function sanitizeInputValue(input) {
  if (!input || !input.value) return;
  const val = input.value;
  const safeVal = val.replace(/[<>]/g, "");
  if (val !== safeVal) {
    console.warn("ورودی مشکوک پاک‌سازی شد:", val);
    input.value = safeVal;
  }
}

/**
 * جلوگیری از ارسال چندباره فرم
 */
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

/**
 * ذخیره امن داده‌های موقت در sessionStorage
 */
function safeSessionStore(key, val) {
  try {
    sessionStorage.setItem(key, val);
  } catch (err) {
    console.error("Session storage error:", err);
  }
}

/**
 * حذف خودکار داده‌های حساس هنگام ترک صفحه
 */
window.addEventListener("beforeunload", () => {
  sessionStorage.removeItem("otp_mobile");
  sessionStorage.removeItem("otp_tries");
});

/* =======================================================
   ✅ جلوگیری از عبور در صورت خطا
   (روی دکمه دریافت کد)
   ======================================================= */
const getCodeBtn = document.querySelector("#getCodeBtn");
if (getCodeBtn) {
  getCodeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const mobileInput = document.querySelector("#firstLogPage .onlyNum");
    if (!mobileInput) return;

    sanitizeInputValue(mobileInput);
    const val = sanitizeToDigits(mobileInput.value);
    const { valid, msg } = validateIranMobile(val);

    if (!valid) {
      showError(mobileInput, msg);
      mobileInput.focus();
      return; // ❌ اگر خطا وجود دارد، اجازه عبور نده
    }

    clearError(mobileInput);
    safeSessionStore("otp_mobile", val);

    // ✅ فقط در صورت صحت شماره، مرحله بعد فعال می‌شود
    showSectionBySectionId("thirdLogPage", () => {
      wireOtpInputs();
      const firstOtp = document.querySelector("#thirdLogPage .inputsContainer input");
      if (firstOtp) firstOtp.focus();
    });
  });
}

/* =======================================================
   ✅ امنیت بخش OTP (ضد brute-force)
   ======================================================= */
const otpInputs = document.querySelectorAll('#thirdLogPage .inputsContainer input');
const otpButton = document.querySelector('#thirdLogPage .submitCountainer button');

if (otpButton) {
  otpButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (preventDoubleSubmit(otpButton)) return;

    const otp = Array.from(otpInputs).map(i => sanitizeToDigits(i.value)).join('');
    if (otp.length !== 5) {
      alert("کد تایید باید شامل ۵ رقم باشد.");
      return;
    }

    const tries = Number(sessionStorage.getItem("otp_tries") || 0);
    if (tries >= 5) {
      alert("تعداد تلاش بیش از حد! بعداً تلاش کنید.");
      otpButton.disabled = true;
      return;
    }
    sessionStorage.setItem("otp_tries", tries + 1);

    console.log("✅ OTP sent securely:", otp);
  });
}

/* =======================================================
   ✅ امنیت برای ورود با رمز عبور
   ======================================================= */
const passwordLoginBtn = document.querySelector('#secondLogPage .submitCountainer button');
if (passwordLoginBtn) {
  passwordLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (preventDoubleSubmit(passwordLoginBtn)) return;

    const username = document.querySelector('#secondLogPage .onlyNum');
    const password = document.querySelector('#inputPassword');
    sanitizeInputValue(username);
    sanitizeInputValue(password);

    if (!username.value || !validateIranMobile(sanitizeToDigits(username.value)).valid) {
      showError(username, 'شماره موبایل یا نام کاربری معتبر نیست.');
      username.focus();
      return;
    }
    clearError(username);

    if (!password.value || password.value.length < 6) {
      showError(password, 'رمز عبور باید حداقل ۶ کاراکتر باشد.');
      password.focus();
      return;
    }
    clearError(password);

    console.log("🔐 Password login validated (safe).");
  });
}

/* =======================================================
   ✅ امنیت بخش فراموشی رمز عبور
   ======================================================= */
const forgetBtn = document.querySelector('#forgetPassword .submitCountainer button');
if (forgetBtn) {
  forgetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (preventDoubleSubmit(forgetBtn)) return;

    const mobileInput = document.querySelector('#forgetPassword .onlyNum');
    sanitizeInputValue(mobileInput);

    const val = sanitizeToDigits(mobileInput.value);
    const { valid, msg } = validateIranMobile(val);
    if (!valid) {
      showError(mobileInput, msg);
      mobileInput.focus();
      return;
    }
    clearError(mobileInput);
    safeSessionStore("otp_mobile", val);
    console.log("📱 Password recovery for:", val);
  });
}

/* =======================================================
   ✅ ایمنی عمومی
   ======================================================= */
// جلوگیری از paste در رمز عبور
const pwdField = document.querySelector("#inputPassword");
if (pwdField) pwdField.addEventListener("paste", (e) => e.preventDefault());

// جلوگیری از راست‌کلیک در ورودی‌ها
document.querySelectorAll(".login .inputContainer").forEach((el) => {
  el.addEventListener("contextmenu", (e) => e.preventDefault());
});

// هشدار برای باز کردن DevTools (اختیاری)
window.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.shiftKey && e.key === "J") ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
    alert("دسترسی به کد غیرمجاز است 😎");
  }
});
