/* =========================================================
   SARVODAY PUBLIC SCHOOL
   SCHOOL MANAGEMENT SYSTEM
   OTP + ROLE BASED ACCESS
========================================================= */

"use strict";


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "sarvoday_school_management_v3";
const SESSION_KEY = "sarvoday_school_session_v3";


/* =========================================================
   ROLE CONFIGURATION
========================================================= */

const ROLES = {
    superadmin: {
        label: "Super Admin",
        parent: null,
        canCreate: ["principal"]
    },

    principal: {
        label: "Principal",
        parent: "superadmin",
        canCreate: ["coordinator"]
    },

    coordinator: {
        label: "Coordinator",
        parent: "principal",
        canCreate: ["teacher"]
    },

    teacher: {
        label: "Teacher",
        parent: "coordinator",
        canCreate: ["student"]
    },

    student: {
        label: "Student",
        parent: "teacher",
        canCreate: []
    }
};


/* =========================================================
   NAVIGATION
========================================================= */

const NAVIGATION = {
    superadmin: [
        ["dashboard", "🏠", "Dashboard"],
        ["principals", "👨‍💼", "Principal"],
        ["coordinators", "👥", "Coordinators"],
        ["teachers", "👨‍🏫", "Teachers"],
        ["students", "🎓", "Students"],
        ["buses", "🚌", "Bus Management"],
        ["fees", "💰", "Fee Management"],
        ["notices", "📢", "Notices"]
    ],

    principal: [
        ["dashboard", "🏠", "Dashboard"],
        ["coordinators", "👥", "Coordinator"],
        ["teachers", "👨‍🏫", "Teachers"],
        ["students", "🎓", "Students"],
        ["buses", "🚌", "Bus Management"],
        ["fees", "💰", "Fee Management"],
        ["notices", "📢", "Notices"]
    ],

    coordinator: [
        ["dashboard", "🏠", "Dashboard"],
        ["teachers", "👨‍🏫", "Teachers"],
        ["students", "🎓", "Students"],
        ["attendance", "📋", "Attendance"],
        ["notices", "📢", "Notices"]
    ],

    teacher: [
        ["dashboard", "🏠", "Dashboard"],
        ["students", "🎓", "Students"],
        ["attendance", "📋", "Attendance"],
        ["notices", "📢", "Notices"],
        ["profile", "👤", "My Profile"]
    ],

    student: [
        ["dashboard", "🏠", "Dashboard"],
        ["profile", "👤", "My Profile"],
        ["fees", "💰", "My Fees"],
        ["attendance", "📋", "My Attendance"],
        ["notices", "📢", "Notices"]
    ]
};


/* =========================================================
   STATE
========================================================= */

let db = null;
let session = null;

let pendingLogin = null;
let generatedOTP = null;
let otpExpiry = null;

let currentPage = "dashboard";


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   DATABASE
========================================================= */

function defaultDatabase() {

    return {
        version: 3,

        users: [
            {
                id: "USR-SUPER-001",
                name: "Super Admin",
                role: "superadmin",
                mobile: "9151110219",
                password: "admin123",
                active: true,
                parentId: null,
                createdAt: new Date().toISOString()
            }
        ],

        students: [],

        attendance: [],

        buses: [],

        fees: {
            monthly: 0,
            exam: 0,
            bus: 0
        },

        notices: [
            {
                id: "NOTICE-001",
                title: "Welcome",
                message: "Welcome to Sarvoday Public School Management Portal.",
                createdAt: new Date().toISOString()
            }
        ],

        notifications: []
    };
}


function loadDatabase() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            db = defaultDatabase();

            saveDatabase();

            return;
        }

        db = JSON.parse(saved);

        if (!db.users) db.users = [];
        if (!db.students) db.students = [];
        if (!db.attendance) db.attendance = [];
        if (!db.buses) db.buses = [];
        if (!db.fees) {
            db.fees = {
                monthly: 0,
                exam: 0,
                bus: 0
            };
        }

        if (!db.notices) db.notices = [];
        if (!db.notifications) db.notifications = [];

    } catch (error) {

        console.error(error);

        db = defaultDatabase();

        saveDatabase();
    }
}


function saveDatabase() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(db)
    );
}


/* =========================================================
   SESSION
========================================================= */

function saveSession() {

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
    );
}


function loadSession() {

    try {

        const saved = localStorage.getItem(SESSION_KEY);

        if (saved) {

            session = JSON.parse(saved);

            const user = getCurrentUser();

            if (user && user.active) {
                showApplication();
                return;
            }
        }

    } catch (error) {

        console.error(error);
    }

    session = null;
}


function getCurrentUser() {

    if (!session) return null;

    return db.users.find(
        user => user.id === session.userId
    ) || null;
}


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    loadDatabase();

    setupEvents();

    setTimeout(() => {

        $("splashScreen").classList.add("hidden");

        if (!session) {

            $("loginScreen").classList.remove("hidden");

        }

    }, 1600);

    loadSession();
});


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    $("loginForm").addEventListener(
        "submit",
        handleLogin
    );

    $("togglePassword").addEventListener(
        "click",
        togglePassword
    );

    $("forgotPasswordButton").addEventListener(
        "click",
        openForgotPassword
    );

    $("logoutButton").addEventListener(
        "click",
        logout
    );

    $("settingsButton").addEventListener(
        "click",
        () => openSettings()
    );

    $("modalCloseButton").addEventListener(
        "click",
        closeModal
    );

    $("modalOverlay").addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("modalOverlay")
            ) {
                closeModal();
            }

        }
    );

    $("mobileMenuButton").addEventListener(
        "click",
        () => {

            $("sidebar").classList.toggle("open");

        }
    );

    $("notificationButton").addEventListener(
        "click",
        openNotifications
    );
}


/* =========================================================
   LOGIN
========================================================= */

function handleLogin(event) {

    event.preventDefault();

    const mobile =
        $("loginId").value.trim();

    const password =
        $("loginPassword").value;

    hideLoginError();

    if (!mobile || !password) {

        showLoginError(
            "Please enter mobile number and password."
        );

        return;
    }

    const user = db.users.find(
        item =>
            item.mobile === mobile &&
            item.active === true
    );

    if (!user) {

        showLoginError(
            "This mobile number is not registered."
        );

        return;
    }

    if (user.password !== password) {

        showLoginError(
            "Incorrect password."
        );

        return;
    }

    startOTPStep(user);
}


function startOTPStep(user) {

    generatedOTP = generateOTP();

    otpExpiry =
        Date.now() + (5 * 60 * 1000);

    pendingLogin = {
        userId: user.id,
        mobile: user.mobile
    };

    $("loginForm").classList.add("hidden");

    showOTPForm(user);

    console.log(
        "DEMO OTP:",
        generatedOTP
    );

    showToast(
        "OTP Generated",
        `Demo OTP for ${user.mobile}: ${generatedOTP}`,
        "success",
        12000
    );
}


/* =========================================================
   OTP
========================================================= */

function generateOTP() {

    if (
        window.crypto &&
        window.crypto.getRandomValues
    ) {

        const array =
            new Uint32Array(1);

        window.crypto.getRandomValues(array);

        return String(
            100000 +
            (array[0] % 900000)
        );
    }

    return String(
        Math.floor(
            100000 +
            Math.random() * 900000
        )
    );
}


function showOTPForm(user) {

    const loginCard =
        document.querySelector(".login-card");

    let otpBox =
        document.getElementById("otpBox");

    if (otpBox) {
        otpBox.remove();
    }

    otpBox = document.createElement("div");

    otpBox.id = "otpBox";

    otpBox.innerHTML = `

        <div class="login-brand">

            <div class="mini-logo">
                OTP
            </div>

            <h1>Verify OTP</h1>

            <p>
                OTP sent to
                <strong>${escapeHTML(user.mobile)}</strong>
            </p>

        </div>

        <div class="input-group">

            <label for="otpInput">
                Enter 6 Digit OTP
            </label>

            <div class="input-box">

                <span>🔢</span>

                <input
                    id="otpInput"
                    type="tel"
                    maxlength="6"
                    inputmode="numeric"
                    placeholder="Enter OTP"
                >

            </div>

        </div>

        <div
            id="otpError"
            class="error-message hidden"
        ></div>

        <button
            id="verifyOTPButton"
            class="primary-button"
            type="button"
        >
            Verify & Login
        </button>

        <button
            id="resendOTPButton"
            class="text-button"
            type="button"
        >
            Resend OTP
        </button>

        <button
            id="backToLoginButton"
            class="text-button"
            type="button"
        >
            ← Back to Login
        </button>

        <div class="demo-note">

            <strong>Demo OTP Mode</strong>

            <p>
                Real SMS delivery requires a secure
                backend and SMS provider.
            </p>

        </div>
    `;

    loginCard.appendChild(otpBox);

    $("verifyOTPButton").addEventListener(
        "click",
        verifyOTP
    );

    $("resendOTPButton").addEventListener(
        "click",
        resendOTP
    );

    $("backToLoginButton").addEventListener(
        "click",
        backToPasswordLogin
    );

    $("otpInput").focus();
}


function verifyOTP() {

    const entered =
        $("otpInput").value.trim();

    const error =
        $("otpError");

    error.classList.add("hidden");

    if (!/^\d{6}$/.test(entered)) {

        error.textContent =
            "Please enter a valid 6 digit OTP.";

        error.classList.remove("hidden");

        return;
    }

    if (
        !otpExpiry ||
        Date.now() > otpExpiry
    ) {

        error.textContent =
            "OTP expired. Please resend OTP.";

        error.classList.remove("hidden");

        return;
    }

    if (entered !== generatedOTP) {

        error.textContent =
            "Incorrect OTP.";

        error.classList.remove("hidden");

        return;
    }

    const user =
        db.users.find(
            item =>
                item.id === pendingLogin.userId
        );

    if (!user || !user.active) {

        error.textContent =
            "Account is no longer active.";

        error.classList.remove("hidden");

        return;
    }

    session = {
        userId: user.id,
        loginTime: new Date().toISOString()
    };

    saveSession();

    pendingLogin = null;
    generatedOTP = null;
    otpExpiry = null;

    $("loginScreen").classList.add("hidden");

    $("otpBox")?.remove();

    $("loginForm").reset();

    showApplication();

    showToast(
        "Login Successful",
        `Welcome ${user.name}.`,
        "success"
    );
}


function resendOTP() {

    if (!pendingLogin) return;

    const user =
        db.users.find(
            item =>
                item.id === pendingLogin.userId
        );

    if (!user) return;

    generatedOTP = generateOTP();

    otpExpiry =
        Date.now() + (5 * 60 * 1000);

    showToast(
        "New OTP Generated",
        `Demo OTP: ${generatedOTP}`,
        "success",
        12000
    );
}


function backToPasswordLogin() {

    $("otpBox")?.remove();

    $("loginForm").classList.remove("hidden");

    pendingLogin = null;
    generatedOTP = null;
    otpExpiry = null;
}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

function openForgotPassword() {

    openModal(`
        <div class="modal-title">
            <h2>Reset Password</h2>
            <p>
                OTP will be generated for the
                registered mobile number.
            </p>
        </div>

        <form id="forgotForm">

            <div class="form-group">

                <label>
                    Registered Mobile Number
                </label>

                <input
                    id="forgotMobile"
                    class="form-control"
                    type="tel"
                    placeholder="Enter registered mobile"
                    required
                >

            </div>

            <div class="form-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="closeModal()"
                >
                    Cancel
                </button>

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Send OTP
                </button>

            </div>

        </form>
    `);

    $("forgotForm").addEventListener(
        "submit",
        sendForgotOTP
    );
}


let resetOTP = null;
let resetUserId = null;


function sendForgotOTP(event) {

    event.preventDefault();

    const mobile =
        $("forgotMobile").value.trim();

    const user =
        db.users.find(
            item =>
                item.mobile === mobile &&
                item.active
        );

    if (!user) {

        showToast(
            "Not Found",
            "No active account is registered with this number.",
            "error"
        );

        return;
    }

    resetOTP = generateOTP();

    resetUserId = user.id;

    showToast(
        "Demo Reset OTP",
        `OTP: ${resetOTP}`,
        "success",
        12000
    );

    showResetPasswordForm();
}


function showResetPasswordForm() {

    $("modalContent").innerHTML = `

        <div class="modal-title">
            <h2>Verify & Reset</h2>
            <p>
                Enter OTP and create your new password.
            </p>
        </div>

        <form id="resetForm">

            <div class="form-group">

                <label>OTP</label>

                <input
                    id="resetOTP"
                    class="form-control"
                    maxlength="6"
                    inputmode="numeric"
                    required
                >

            </div>

            <div class="form-group">

                <label>New Password</label>

                <input
                    id="newPassword"
                    class="form-control"
                    type="password"
                    required
                >

            </div>

            <div class="form-footer">

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Reset Password
                </button>

            </div>

        </form>
    `;

    $("resetForm").addEventListener(
        "submit",
        resetPassword
    );
}


function resetPassword(event) {

    event.preventDefault();

    const otp =
        $("resetOTP").value.trim();

    const password =
        $("newPassword").value;

    if (otp !== resetOTP) {

        showToast(
            "Invalid OTP",
            "Please enter the correct OTP.",
            "error"
        );

        return;
    }

    if (!password) {

        showToast(
            "Password Required",
            "Please enter a new password.",
            "error"
        );

        return;
    }

    const user =
        db.users.find(
            item => item.id === resetUserId
        );

    if (!user) return;

    user.password = password;

    saveDatabase();

    resetOTP = null;
    resetUserId = null;

    closeModal();

    showToast(
        "Password Updated",
        "Your password has been changed successfully.",
        "success"
    );
}


/* =========================================================
   APPLICATION
========================================================= */

function showApplication() {

    const user = getCurrentUser();

    if (!user) {

        logout();

        return;
    }

    $("loginScreen").classList.add("hidden");

    $("mainApplication").classList.remove("hidden");

    updateUserUI();

    renderNavigation();

    renderPage("dashboard");
}


function updateUserUI() {

    const user = getCurrentUser();

    if (!user) return;

    const initials =
        getInitials(user.name);

    $("sidebarUserAvatar").textContent =
        initials;

    $("sidebarUserName").textContent =
        user.name;

    $("sidebarUserRole").textContent =
        ROLES[user.role]?.label ||
        user.role;

    $("topbarAvatar").textContent =
        initials;

    $("topbarName").textContent =
        user.name;

    $("topbarRole").textContent =
        ROLES[user.role]?.label ||
        user.role;
}


/* =========================================================
   NAVIGATION
========================================================= */

function renderNavigation() {

    const user = getCurrentUser();

    if (!user) return;

    const nav =
        $("sidebarNavigation");

    nav.innerHTML = "";

    const items =
        NAVIGATION[user.role] || [];

    items.forEach(item => {

        const [
            page,
            icon,
            label
        ] = item;

        const button =
            document.createElement("button");

        button.className =
            "nav-item";

        button.dataset.page =
            page;

        button.innerHTML = `
            <span>${icon}</span>
            <span>${label}</span>
        `;

        button.addEventListener(
            "click",
            () => {

                renderPage(page);

                $("sidebar").classList.remove(
                    "open"
                );

            }
        );

        nav.appendChild(button);
    });
}


function renderPage(page) {

    const user = getCurrentUser();

    if (!user) return;

    const allowed =
        (NAVIGATION[user.role] || [])
            .some(item => item[0] === page);

    if (!allowed) {

        showToast(
            "Access Denied",
            "You do not have permission to open this section.",
            "error"
        );

        return;
    }

    currentPage = page;

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        });

    const labels = {
        dashboard: "Dashboard",
        principals: "Principal",
        coordinators: "Coordinator",
        teachers: "Teachers",
        students: "Students",
        buses: "Bus Management",
        fees: "Fee Management",
        notices: "Notices",
        attendance: "Attendance",
        profile: "My Profile"
    };

    $("pageBreadcrumb").textContent =
        labels[page] || "Portal";

    $("pageTitle").textContent =
        labels[page] || "Portal";

    const container =
        $("pageContainer");

    container.innerHTML = "";

    switch (page) {

        case "dashboard":
            renderDashboard(container);
            break;

        case "principals":
            renderUsersPage(
                container,
                "principal"
            );
            break;

        case "coordinators":
            renderUsersPage(
                container,
                "coordinator"
            );
            break;

        case "teachers":
            renderUsersPage(
                container,
                "teacher"
            );
            break;

        case "students":
            renderStudentsPage(container);
            break;

        case "buses":
            renderBusesPage(container);
            break;

        case "fees":
            renderFeesPage(container);
            break;

        case "notices":
            renderNoticesPage(container);
            break;

        case "attendance":
            renderAttendancePage(container);
            break;

        case "profile":
            renderProfilePage(container);
            break;

        default:
            renderDashboard(container);
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard(container) {

    const user = getCurrentUser();

    const counts = {
        principals:
            db.users.filter(
                u => u.role === "principal"
            ).length,

        coordinators:
            db.users.filter(
                u => u.role === "coordinator"
            ).length,

        teachers:
            db.users.filter(
                u => u.role === "teacher"
            ).length,

        students:
            db.users.filter(
                u => u.role === "student"
            ).length
    };

    let cards = [];

    if (user.role === "superadmin") {

        cards = [
            ["👨‍💼", "Principals", counts.principals],
            ["👥", "Coordinators", counts.coordinators],
            ["👨‍🏫", "Teachers", counts.teachers],
            ["🎓", "Students", counts.students]
        ];

    } else if (user.role === "principal") {

        cards = [
            ["👥", "Coordinators", counts.coordinators],
            ["👨‍🏫", "Teachers", counts.teachers],
            ["🎓", "Students", counts.students],
            ["🚌", "Buses", db.buses.length]
        ];

    } else if (user.role === "coordinator") {

        cards = [
            ["👨‍🏫", "Teachers", counts.teachers],
            ["🎓", "Students", counts.students],
            ["📋", "Attendance", db.attendance.length],
            ["📢", "Notices", db.notices.length]
        ];

    } else if (user.role === "teacher") {

        const myStudents =
            db.users.filter(
                u =>
                    u.role === "student" &&
                    u.parentId === user.id
            ).length;

        cards = [
            ["🎓", "My Students", myStudents],
            ["📋", "Attendance", db.attendance.length],
            ["📢", "Notices", db.notices.length]
        ];

    } else {

        cards = [
            ["💰", "Fee Records", 1],
            ["📋", "Attendance", getMyAttendance().length],
            ["📢", "Notices", db.notices.length]
        ];
    }

    container.innerHTML = `

        <div class="page-header">

            <div>
                <h3>Welcome, ${escapeHTML(user.name)}</h3>
                <p>
                    ${ROLES[user.role].label}
                    • Sarvoday Public School
                </p>
            </div>

        </div>

        <div class="stats-grid">

            ${cards.map(card => `

                <div class="stat-card">

                    <div class="stat-icon">
                        ${card[0]}
                    </div>

                    <small>${card[1]}</small>

                    <h2>${card[2]}</h2>

                </div>

            `).join("")}

        </div>

        <div class="content-card">

            <div class="card-header">

                <h3>School Portal</h3>

                <span class="badge badge-purple">
                    ${ROLES[user.role].label}
                </span>

            </div>

            <div class="card-body">

                <p style="color:var(--text-secondary);line-height:1.8;">
                    You are logged in with your registered
                    school account. Your available sections
                    are controlled by your role.
                </p>

            </div>

        </div>
    `;
}


/* =========================================================
   USER MANAGEMENT
========================================================= */

function renderUsersPage(
    container,
    role
) {

    const currentUser =
        getCurrentUser();

    const users =
        db.users.filter(
            user =>
                user.role === role &&
                user.active
        );

    const canCreate =
        canCreateRole(role);

    container.innerHTML = `

        <div class="page-header">

            <div>
                <h3>
                    ${ROLES[role].label} Management
                </h3>

                <p>
                    Manage registered
                    ${ROLES[role].label.toLowerCase()}
                    accounts.
                </p>
            </div>

            ${
                canCreate
                ?
                `
                <button
                    class="btn btn-primary"
                    onclick="openCreateUserModal('${role}')"
                >
                    + Add ${ROLES[role].label}
                </button>
                `
                :
                ""
            }

        </div>

        <div class="content-card">

            <div class="table-wrapper">

                <table class="data-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created By</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${
                            users.length
                            ?
                            users.map(user => {

                                const creator =
                                    db.users.find(
                                        u =>
                                            u.id === user.parentId
                                    );

                                return `

                                    <tr>

                                        <td>
                                            <strong>
                                                ${escapeHTML(user.name)}
                                            </strong>
                                        </td>

                                        <td>
                                            ${escapeHTML(user.mobile)}
                                        </td>

                                        <td>
                                            <span class="badge badge-purple">
                                                ${ROLES[user.role].label}
                                            </span>
                                        </td>

                                        <td>
                                            <span class="badge badge-green">
                                                Active
                                            </span>
                                        </td>

                                        <td>
                                            ${
                                                creator
                                                ?
                                                escapeHTML(creator.name)
                                                :
                                                "System"
                                            }
                                        </td>

                                        <td>

                                            ${
                                                canManageUser(user)
                                                ?
                                                `
                                                <div class="button-row">

                                                    <button
                                                        class="btn btn-secondary"
                                                        onclick="openEditUserModal('${user.id}')"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        class="btn btn-danger"
                                                        onclick="removeUser('${user.id}')"
                                                    >
                                                        Remove
                                                    </button>

                                                </div>
                                                `
                                                :
                                                `<span class="badge badge-purple">View Only</span>`
                                            }

                                        </td>

                                    </tr>
                                `;
                            }).join("")
                            :
                            `
                            <tr>
                                <td colspan="6">

                                    <div class="empty-state">

                                        <div class="empty-icon">
                                            👤
                                        </div>

                                        <strong>
                                            No ${ROLES[role].label}
                                            accounts yet
                                        </strong>

                                        <span>
                                            ${
                                                canCreate
                                                ?
                                                "Use the Add button to create one."
                                                :
                                                "No account has been created."
                                            }
                                        </span>

                                    </div>

                                </td>
                            </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function canCreateRole(role) {

    const currentUser =
        getCurrentUser();

    if (!currentUser) return false;

    return (
        ROLES[currentUser.role]
            ?.canCreate
            ?.includes(role)
    );
}


function canManageUser(user) {

    const currentUser =
        getCurrentUser();

    if (!currentUser) return false;

    if (currentUser.role === "superadmin") {

        return user.role === "principal";
    }

    return user.parentId === currentUser.id;
}


/* =========================================================
   CREATE USER
========================================================= */

function openCreateUserModal(role) {

    if (!canCreateRole(role)) {

        showToast(
            "Access Denied",
            "You cannot create this role.",
            "error"
        );

        return;
    }

    openModal(`

        <div class="modal-title">

            <h2>
                Add ${ROLES[role].label}
            </h2>

            <p>
                The registered mobile number
                will receive the login OTP.
            </p>

        </div>

        <form id="createUserForm">

            <div class="form-grid">

                <div class="form-group">

                    <label>Full Name</label>

                    <input
                        id="newUserName"
                        class="form-control"
                        required
                        placeholder="Enter full name"
                    >

                </div>

                <div class="form-group">

                    <label>Registered Mobile Number</label>

                    <input
                        id="newUserMobile"
                        class="form-control"
                        type="tel"
                        maxlength="10"
                        required
                        placeholder="10 digit mobile"
                    >

                </div>

                <div class="form-group">

                    <label>Password</label>

                    <input
                        id="newUserPassword"
                        class="form-control"
                        type="password"
                        required
                        placeholder="Create password"
                    >

                </div>

                ${
                    role === "student"
                    ?
                    `
                    <div class="form-group">

                        <label>Class</label>

                        <input
                            id="newStudentClass"
                            class="form-control"
                            placeholder="e.g. 8-A"
                        >

                    </div>

                    <div class="form-group">

                        <label>Roll Number</label>

                        <input
                            id="newStudentRoll"
                            class="form-control"
                            placeholder="Roll number"
                        >

                    </div>

                    <div class="form-group">

                        <label>Registration Number</label>

                        <input
                            id="newStudentRegistration"
                            class="form-control"
                            placeholder="Registration number"
                        >

                    </div>

                    <div class="form-group">

                        <label>Admission Number</label>

                        <input
                            id="newStudentAdmission"
                            class="form-control"
                            placeholder="Admission number"
                        >

                    </div>

                    <div class="form-group">

                        <label>Father's Name</label>

                        <input
                            id="newStudentFather"
                            class="form-control"
                        >

                    </div>

                    <div class="form-group">

                        <label>Mother's Name</label>

                        <input
                            id="newStudentMother"
                            class="form-control"
                        >

                    </div>

                    <div class="form-group">

                        <label>Date of Birth</label>

                        <input
                            id="newStudentDOB"
                            class="form-control"
                            type="date"
                        >

                    </div>

                    <div class="form-group">

                        <label>Student ID</label>

                        <input
                            id="newStudentID"
                            class="form-control"
                            placeholder="Student ID"
                        >

                    </div>
                    `
                    :
                    ""
                }

            </div>

            <div class="form-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="closeModal()"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Create Account
                </button>

            </div>

        </form>
    `);

    $("createUserForm").addEventListener(
        "submit",
        event => createUser(event, role)
    );
}


function createUser(event, role) {

    event.preventDefault();

    const creator =
        getCurrentUser();

    const name =
        $("newUserName").value.trim();

    const mobile =
        $("newUserMobile").value.trim();

    const password =
        $("newUserPassword").value;

    if (!name || !mobile || !password) {

        showToast(
            "Missing Information",
            "Please fill all required fields.",
            "error"
        );

        return;
    }

    if (!/^\d{10}$/.test(mobile)) {

        showToast(
            "Invalid Mobile",
            "Enter a valid 10 digit mobile number.",
            "error"
        );

        return;
    }

    if (password.length < 1) {

        showToast(
            "Password Required",
            "Password cannot be empty.",
            "error"
        );

        return;
    }

    const duplicate =
        db.users.some(
            user => user.mobile === mobile
        );

    if (duplicate) {

        showToast(
            "Already Registered",
            "This mobile number is already registered.",
            "error"
        );

        return;
    }

    const user = {

        id:
            "USR-" +
            Date.now() +
            "-" +
            Math.floor(Math.random() * 1000),

        name,
        role,
        mobile,
        password,

        active: true,

        parentId:
            creator.id,

        createdAt:
            new Date().toISOString()
    };

    db.users.push(user);

    if (role === "student") {

        const student = {

            userId: user.id,

            name,

            rollNumber:
                $("newStudentRoll")?.value.trim() || "",

            registrationNumber:
                $("newStudentRegistration")?.value.trim() || "",

            admissionNumber:
                $("newStudentAdmission")?.value.trim() || "",

            fatherName:
                $("newStudentFather")?.value.trim() || "",

            motherName:
                $("newStudentMother")?.value.trim() || "",

            dateOfBirth:
                $("newStudentDOB")?.value || "",

            studentId:
                $("newStudentID")?.value.trim() ||
                ("STU-" + Date.now()),

            className:
                $("newStudentClass")?.value.trim() || "",

            feeReceipts: [],

            feeDetails: {
                monthly: 0,
                exam: 0,
                bus: 0,
                discount: 0
            }
        };

        db.students.push(student);
    }

    saveDatabase();

    closeModal();

    renderPage(currentPage);

    showToast(
        "Account Created",
        `${name} can now login using ${mobile}, password and OTP.`,
        "success"
    );
}


/* =========================================================
   EDIT USER
========================================================= */

function openEditUserModal(userId) {

    const user =
        db.users.find(
            item => item.id === userId
        );

    if (!user) return;

    if (!canManageUser(user)) {

        showToast(
            "Access Denied",
            "You cannot edit this account.",
            "error"
        );

        return;
    }

    openModal(`

        <div class="modal-title">

            <h2>Edit Account</h2>

            <p>
                Update registered information.
            </p>

        </div>

        <form id="editUserForm">

            <div class="form-group">

                <label>Name</label>

                <input
                    id="editUserName"
                    class="form-control"
                    value="${escapeAttribute(user.name)}"
                    required
                >

            </div>

            <div class="form-group" style="margin-top:15px;">

                <label>Mobile Number</label>

                <input
                    id="editUserMobile"
                    class="form-control"
                    value="${escapeAttribute(user.mobile)}"
                    maxlength="10"
                    required
                >

            </div>

            <div class="form-group" style="margin-top:15px;">

                <label>New Password</label>

                <input
                    id="editUserPassword"
                    class="form-control"
                    type="password"
                    placeholder="Leave empty to keep current"
                >

            </div>

            <div class="form-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="closeModal()"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Save Changes
                </button>

            </div>

        </form>
    `);

    $("editUserForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const name =
                $("editUserName").value.trim();

            const mobile =
                $("editUserMobile").value.trim();

            const password =
                $("editUserPassword").value;

            if (!name || !/^\d{10}$/.test(mobile)) {

                showToast(
                    "Invalid Information",
                    "Check name and mobile number.",
                    "error"
                );

                return;
            }

            const duplicate =
                db.users.some(
                    other =>
                        other.id !== user.id &&
                        other.mobile === mobile
                );

            if (duplicate) {

                showToast(
                    "Mobile Already Used",
                    "Another account already uses this number.",
                    "error"
                );

                return;
            }

            user.name = name;
            user.mobile = mobile;

            if (password) {
                user.password = password;
            }

            saveDatabase();

            closeModal();

            updateUserUI();

            renderPage(currentPage);

            showToast(
                "Updated",
                "Account information updated.",
                "success"
            );
        }
    );
}


/* =========================================================
   REMOVE USER
========================================================= */

function removeUser(userId) {

    const user =
        db.users.find(
            item => item.id === userId
        );

    if (!user) return;

    if (!canManageUser(user)) {

        showToast(
            "Access Denied",
            "You cannot remove this account.",
            "error"
        );

        return;
    }

    const ok =
        confirm(
            `Remove ${user.name}'s account?`
        );

    if (!ok) return;

    user.active = false;

    saveDatabase();

    renderPage(currentPage);

    showToast(
        "Account Removed",
        `${user.name}'s login access has been disabled.`,
        "success"
    );
}


/* =========================================================
   STUDENTS
========================================================= */

function renderStudentsPage(container) {

    const user =
        getCurrentUser();

    let students =
        db.students;

    if (user.role === "teacher") {

        students =
            students.filter(
                student => {

                    const account =
                        db.users.find(
                            u =>
                                u.id === student.userId
                        );

                    return (
                        account &&
                        account.parentId === user.id
                    );
                }
            );
    }

    if (user.role === "student") {

        students =
            students.filter(
                student =>
                    student.userId === user.id
            );
    }

    const canAdd =
        canCreateRole("student");

    container.innerHTML = `

        <div class="page-header">

            <div>

                <h3>Students</h3>

                <p>
                    Student records and academic information.
                </p>

            </div>

            ${
                canAdd
                ?
                `
                <button
                    class="btn btn-primary"
                    onclick="openCreateUserModal('student')"
                >
                    + Add Student
                </button>
                `
                :
                ""
            }

        </div>

        <div class="content-card">

            <div class="table-wrapper">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>Student</th>
                            <th>Student ID</th>
                            <th>Class</th>
                            <th>Roll</th>
                            <th>Registration</th>
                            <th>Parent</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            students.length
                            ?
                            students.map(student => {

                                const account =
                                    db.users.find(
                                        u =>
                                            u.id === student.userId
                                    );

                                return `

                                    <tr>

                                        <td>
                                            <strong>
                                                ${escapeHTML(student.name)}
                                            </strong>
                                        </td>

                                        <td>
                                            ${escapeHTML(student.studentId)}
                                        </td>

                                        <td>
                                            ${escapeHTML(student.className || "-")}
                                        </td>

                                        <td>
                                            ${escapeHTML(student.rollNumber || "-")}
                                        </td>

                                        <td>
                                            ${escapeHTML(student.registrationNumber || "-")}
                                        </td>

                                        <td>
                                            ${
                                                account?.parentId
                                                ?
                                                getUserName(account.parentId)
                                                :
                                                "-"
                                            }
                                        </td>

                                        <td>

                                            <button
                                                class="btn btn-secondary"
                                                onclick="viewStudent('${student.userId}')"
                                            >
                                                View
                                            </button>

                                        </td>

                                    </tr>
                                `;
                            }).join("")
                            :
                            `
                            <tr>

                                <td colspan="7">

                                    <div class="empty-state">

                                        <div class="empty-icon">
                                            🎓
                                        </div>

                                        <strong>
                                            No students found
                                        </strong>

                                        <span>
                                            ${
                                                canAdd
                                                ?
                                                "Add a student to get started."
                                                :
                                                "No student records are available."
                                            }
                                        </span>

                                    </div>

                                </td>

                            </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function viewStudent(userId) {

    const student =
        db.students.find(
            item =>
                item.userId === userId
        );

    const account =
        db.users.find(
            item =>
                item.id === userId
        );

    if (!student || !account) return;

    openModal(`

        <div class="modal-title">

            <h2>${escapeHTML(student.name)}</h2>

            <p>Student Profile</p>

        </div>

        <div class="profile-box">

            <div class="profile-avatar-large">
                ${getInitials(student.name)}
            </div>

            <div class="profile-details">

                ${detail(
                    "Student ID",
                    student.studentId
                )}

                ${detail(
                    "Class",
                    student.className || "-"
                )}

                ${detail(
                    "Roll Number",
                    student.rollNumber || "-"
                )}

                ${detail(
                    "Registration",
                    student.registrationNumber || "-"
                )}

                ${detail(
                    "Admission",
                    student.admissionNumber || "-"
                )}

                ${detail(
                    "Father's Name",
                    student.fatherName || "-"
                )}

                ${detail(
                    "Mother's Name",
                    student.motherName || "-"
                )}

                ${detail(
                    "Date of Birth",
                    student.dateOfBirth || "-"
                )}

            </div>

        </div>
    `);
}


/* =========================================================
   BUS MANAGEMENT
========================================================= */

function renderBusesPage(container) {

    const user =
        getCurrentUser();

    const canManage =
        user.role === "superadmin" ||
        user.role === "principal";

    container.innerHTML = `

        <div class="page-header">

            <div>

                <h3>Bus Management</h3>

                <p>
                    School buses and transport information.
                </p>

            </div>

            ${
                canManage
                ?
                `
                <button
                    class="btn btn-primary"
                    onclick="openBusModal()"
                >
                    + Add Bus
                </button>
                `
                :
                ""
            }

        </div>

        <div class="content-card">

            <div class="table-wrapper">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>Bus Number</th>
                            <th>Driver</th>
                            <th>Contact</th>
                            <th>Route</th>
                            <th>Fee</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            db.buses.length
                            ?
                            db.buses.map(bus => `

                                <tr>

                                    <td>
                                        ${escapeHTML(bus.number)}
                                    </td>

                                    <td>
                                        ${escapeHTML(bus.driver)}
                                    </td>

                                    <td>
                                        ${escapeHTML(bus.contact)}
                                    </td>

                                    <td>
                                        ${escapeHTML(bus.route)}
                                    </td>

                                    <td>
                                        ₹${Number(bus.fee || 0).toLocaleString("en-IN")}
                                    </td>

                                    <td>

                                        ${
                                            canManage
                                            ?
                                            `
                                            <button
                                                class="btn btn-danger"
                                                onclick="removeBus('${bus.id}')"
                                            >
                                                Remove
                                            </button>
                                            `
                                            :
                                            "-"
                                        }

                                    </td>

                                </tr>

                            `).join("")
                            :
                            `
                            <tr>

                                <td colspan="6">

                                    <div class="empty-state">

                                        <div class="empty-icon">
                                            🚌
                                        </div>

                                        <strong>
                                            No buses added
                                        </strong>

                                        <span>
                                            Add school transport information.
                                        </span>

                                    </div>

                                </td>

                            </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function openBusModal() {

    openModal(`

        <div class="modal-title">

            <h2>Add School Bus</h2>

            <p>
                Enter transport information.
            </p>

        </div>

        <form id="busForm">

            <div class="form-grid">

                <div class="form-group">

                    <label>Bus Number</label>

                    <input
                        id="busNumber"
                        class="form-control"
                        required
                    >

                </div>

                <div class="form-group">

                    <label>Driver Name</label>

                    <input
                        id="busDriver"
                        class="form-control"
                        required
                    >

                </div>

                <div class="form-group">

                    <label>Driver Contact</label>

                    <input
                        id="busContact"
                        class="form-control"
                        type="tel"
                    >

                </div>

                <div class="form-group">

                    <label>Monthly Bus Fee</label>

                    <input
                        id="busFee"
                        class="form-control"
                        type="number"
                        min="0"
                        value="0"
                    >

                </div>

                <div class="form-group full">

                    <label>Route</label>

                    <input
                        id="busRoute"
                        class="form-control"
                        placeholder="Enter route"
                    >

                </div>

            </div>

            <div class="form-footer">

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Add Bus
                </button>

            </div>

        </form>
    `);

    $("busForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            db.buses.push({

                id:
                    "BUS-" +
                    Date.now(),

                number:
                    $("busNumber").value.trim(),

                driver:
                    $("busDriver").value.trim(),

                contact:
                    $("busContact").value.trim(),

                route:
                    $("busRoute").value.trim(),

                fee:
                    Number($("busFee").value || 0)
            });

            saveDatabase();

            closeModal();

            renderPage("buses");

            showToast(
                "Bus Added",
                "Bus information saved successfully.",
                "success"
            );
        }
    );
}


function removeBus(id) {

    if (
        !confirm(
            "Remove this bus?"
        )
    ) return;

    db.buses =
        db.buses.filter(
            bus => bus.id !== id
        );

    saveDatabase();

    renderPage("buses");

    showToast(
        "Bus Removed",
        "Bus information removed.",
        "success"
    );
}


/* =========================================================
   FEES
========================================================= */

function renderFeesPage(container) {

    const user =
        getCurrentUser();

    const canManage =
        user.role === "superadmin" ||
        user.role === "principal";

    const students =
        db.students;

    const totalExpected =
        students.length *
        (
            Number(db.fees.monthly || 0) +
            Number(db.fees.exam || 0) +
            Number(db.fees.bus || 0)
        );

    let totalCollected = 0;

    students.forEach(student => {

        const details =
            student.feeDetails || {};

        totalCollected +=
            Number(details.paid || 0);
    });

    let collectionRate =
        totalExpected > 0
        ?
        (totalCollected / totalExpected) * 100
        :
        0;

    collectionRate =
        Math.min(
            100,
            Math.max(0, collectionRate)
        );

    container.innerHTML = `

        <div class="page-header">

            <div>

                <h3>Fee Management</h3>

                <p>
                    Monthly fee, exam fee, bus fee
                    and sibling discount.
                </p>

            </div>

            ${
                canManage
                ?
                `
                <button
                    class="btn btn-primary"
                    onclick="openFeeSettings()"
                >
                    ⚙ Fee Settings
                </button>
                `
                :
                ""
            }

        </div>

        <div class="stats-grid">

            <div class="stat-card">

                <div class="stat-icon">💵</div>

                <small>Monthly Fee</small>

                <h2>
                    ₹${Number(db.fees.monthly || 0).toLocaleString("en-IN")}
                </h2>

            </div>

            <div class="stat-card">

                <div class="stat-icon">📝</div>

                <small>Exam Fee</small>

                <h2>
                    ₹${Number(db.fees.exam || 0).toLocaleString("en-IN")}
                </h2>

            </div>

            <div class="stat-card">

                <div class="stat-icon">🚌</div>

                <small>Bus Fee</small>

                <h2>
                    ₹${Number(db.fees.bus || 0).toLocaleString("en-IN")}
                </h2>

            </div>

            <div class="stat-card">

                <div class="stat-icon">📊</div>

                <small>Collection Rate</small>

                <h2>
                    ${collectionRate.toFixed(1)}%
                </h2>

            </div>

        </div>

        <div class="content-card">

            <div class="card-header">

                <h3>Student Fee Records</h3>

            </div>

            <div class="table-wrapper">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>Student</th>
                            <th>Monthly</th>
                            <th>Exam</th>
                            <th>Bus</th>
                            <th>Sibling Discount</th>
                            <th>Paid</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            students.length
                            ?
                            students.map(student => {

                                const fee =
                                    student.feeDetails || {};

                                return `

                                    <tr>

                                        <td>
                                            ${escapeHTML(student.name)}
                                        </td>

                                        <td>
                                            ₹${Number(
                                                fee.monthly ??
                                                db.fees.monthly
                                            ).toLocaleString("en-IN")}
                                        </td>

                                        <td>
                                            ₹${Number(
                                                fee.exam ??
                                                db.fees.exam
                                            ).toLocaleString("en-IN")}
                                        </td>

                                        <td>
                                            ₹${Number(
                                                fee.bus ??
                                                db.fees.bus
                                            ).toLocaleString("en-IN")}
                                        </td>

                                        <td>
                                            ₹${Number(
                                                fee.discount || 0
                                            ).toLocaleString("en-IN")}
                                        </td>

                                        <td>
                                            ₹${Number(
                                                fee.paid || 0
                                            ).toLocaleString("en-IN")}
                                        </td>

                                    </tr>
                                `;
                            }).join("")
                            :
                            `
                            <tr>
                                <td colspan="6">
                                    <div class="empty-state">
                                        <div class="empty-icon">💰</div>
                                        <strong>No fee records</strong>
                                        <span>
                                            Student fee records will appear here.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function openFeeSettings() {

    openModal(`

        <div class="modal-title">

            <h2>Fee Settings</h2>

            <p>
                Set standard school fees.
            </p>

        </div>

        <form id="feeForm">

            <div class="form-grid">

                <div class="form-group">

                    <label>Monthly Fee</label>

                    <input
                        id="monthlyFee"
                        class="form-control"
                        type="number"
                        min="0"
                        value="${Number(db.fees.monthly || 0)}"
                    >

                </div>

                <div class="form-group">

                    <label>Exam Fee</label>

                    <input
                        id="examFee"
                        class="form-control"
                        type="number"
                        min="0"
                        value="${Number(db.fees.exam || 0)}"
                    >

                </div>

                <div class="form-group">

                    <label>Bus Fee</label>

                    <input
                        id="standardBusFee"
                        class="form-control"
                        type="number"
                        min="0"
                        value="${Number(db.fees.bus || 0)}"
                    >

                </div>

            </div>

            <div class="form-footer">

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Save Fee Settings
                </button>

            </div>

        </form>
    `);

    $("feeForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            db.fees.monthly =
                Number($("monthlyFee").value || 0);

            db.fees.exam =
                Number($("examFee").value || 0);

            db.fees.bus =
                Number($("standardBusFee").value || 0);

            applySiblingDiscount();

            saveDatabase();

            closeModal();

            renderPage("fees");

            showToast(
                "Fee Updated",
                "Fee settings saved successfully.",
                "success"
            );
        }
    );
}


function applySiblingDiscount() {

    const parentGroups = {};

    db.students.forEach(student => {

        const account =
            db.users.find(
                user =>
                    user.id === student.userId
            );

        if (!account) return;

        const parent =
            account.parentId;

        if (!parent) return;

        if (!parentGroups[parent]) {
            parentGroups[parent] = [];
        }

        parentGroups[parent].push(student);
    });

    Object.values(parentGroups)
        .forEach(group => {

            if (group.length >= 2) {

                group.forEach(student => {

                    if (!student.feeDetails) {
                        student.feeDetails = {};
                    }

                    const base =
                        Number(db.fees.monthly || 0);

                    student.feeDetails.discount =
                        Math.round(base * 0.10);
                });
            }

        });
}


/* =========================================================
   NOTICES
========================================================= */

function renderNoticesPage(container) {

    const user =
        getCurrentUser();

    const canManage =
        user.role !== "student";

    container.innerHTML = `

        <div class="page-header">

            <div>

                <h3>School Notices</h3>

                <p>
                    Important school announcements.
                </p>

            </div>

            ${
                canManage
                ?
                `
                <button
                    class="btn btn-primary"
                    onclick="openNoticeModal()"
                >
                    + Add Notice
                </button>
                `
                :
                ""
            }

        </div>

        <div style="display:grid;gap:15px;">

            ${
                db.notices.length
                ?
                db.notices.map(notice => `

                    <div class="content-card">

                        <div class="card-body">

                            <div class="page-header"
                                style="margin-bottom:10px;">

                                <div>

                                    <h3>
                                        ${escapeHTML(notice.title)}
                                    </h3>

                                    <p>
                                        ${formatDate(notice.createdAt)}
                                    </p>

                                </div>

                                ${
                                    canManage
                                    ?
                                    `
                                    <button
                                        class="btn btn-danger"
                                        onclick="removeNotice('${notice.id}')"
                                    >
                                        Remove
                                    </button>
                                    `
                                    :
                                    ""
                                }

                            </div>

                            <p style="
                                color:var(--text-secondary);
                                line-height:1.7;
                            ">
                                ${escapeHTML(notice.message)}
                            </p>

                        </div>

                    </div>

                `).join("")
                :
                `
                <div class="content-card">
                    <div class="empty-state">
                        <div class="empty-icon">📢</div>
                        <strong>No notices</strong>
                        <span>No announcements available.</span>
                    </div>
                </div>
                `
            }

        </div>
    `;
}


function openNoticeModal() {

    openModal(`

        <div class="modal-title">

            <h2>Add Notice</h2>

            <p>
                Create a school announcement.
            </p>

        </div>

        <form id="noticeForm">

            <div class="form-group">

                <label>Notice Title</label>

                <input
                    id="noticeTitle"
                    class="form-control"
                    required
                >

            </div>

            <div class="form-group"
                style="margin-top:15px;">

                <label>Message</label>

                <textarea
                    id="noticeMessage"
                    class="form-control"
                    required
                ></textarea>

            </div>

            <div class="form-footer">

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Publish Notice
                </button>

            </div>

        </form>
    `);

    $("noticeForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            db.notices.unshift({

                id:
                    "NOTICE-" +
                    Date.now(),

                title:
                    $("noticeTitle").value.trim(),

                message:
                    $("noticeMessage").value.trim(),

                createdAt:
                    new Date().toISOString()
            });

            saveDatabase();

            closeModal();

            renderPage("notices");

            showToast(
                "Notice Published",
                "Notice is now available in the portal.",
                "success"
            );
        }
    );
}


function removeNotice(id) {

    if (!confirm("Remove this notice?")) return;

    db.notices =
        db.notices.filter(
            notice => notice.id !== id
        );

    saveDatabase();

    renderPage("notices");

    showToast(
        "Notice Removed",
        "Notice removed successfully.",
        "success"
    );
}


/* =========================================================
   ATTENDANCE
========================================================= */

function renderAttendancePage(container) {

    const user =
        getCurrentUser();

    let students =
        db.students;

    if (user.role === "teacher") {

        students =
            students.filter(
                student => {

                    const account =
                        db.users.find(
                            u =>
                                u.id === student.userId
                        );

                    return (
                        account &&
                        account.parentId === user.id
                    );
                }
            );
    }

    if (user.role === "student") {

        students =
            students.filter(
                student =>
                    student.userId === user.id
            );
    }

    const canMark =
        user.role === "teacher" ||
        user.role === "coordinator" ||
        user.role === "principal" ||
        user.role === "superadmin";

    container.innerHTML = `

        <div class="page-header">

            <div>

                <h3>Attendance</h3>

                <p>
                    Student attendance records.
                </p>

            </div>

        </div>

        <div class="content-card">

            <div class="table-wrapper">

                <table class="data-table">

                    <thead>

                        <tr>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Last Marked</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${
                            students.length
                            ?
                            students.map(student => {

                                const records =
                                    db.attendance.filter(
                                        a =>
                                            a.studentId ===
                                            student.userId
                                    );

                                const present =
                                    records.filter(
                                        a =>
                                            a.status === "Present"
                                    ).length;

                                const absent =
                                    records.filter(
                                        a =>
                                            a.status === "Absent"
                                    ).length;

                                const latest =
                                    records[records.length - 1];

                                return `

                                    <tr>

                                        <td>
                                            ${escapeHTML(student.name)}
                                        </td>

                                        <td>
                                            ${escapeHTML(student.className || "-")}
                                        </td>

                                        <td>
                                            ${present}
                                        </td>

                                        <td>
                                            ${absent}
                                        </td>

                                        <td>
                                            ${
                                                latest
                                                ?
                                                formatDate(latest.date)
                                                :
                                                "-"
                                            }
                                        </td>

                                        <td>

                                            ${
                                                canMark
                                                ?
                                                `
                                                <button
                                                    class="btn btn-success"
                                                    onclick="markAttendance('${student.userId}')"
                                                >
                                                    Mark
                                                </button>
                                                `
                                                :
                                                "-"
                                            }

                                        </td>

                                    </tr>
                                `;
                            }).join("")
                            :
                            `
                            <tr>
                                <td colspan="6">
                                    <div class="empty-state">
                                        <div class="empty-icon">📋</div>
                                        <strong>No students</strong>
                                        <span>
                                            Attendance records will appear here.
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function markAttendance(studentId) {

    const student =
        db.students.find(
            s =>
                s.userId === studentId
        );

    if (!student) return;

    openModal(`

        <div class="modal-title">

            <h2>Mark Attendance</h2>

            <p>
                ${escapeHTML(student.name)}
            </p>

        </div>

        <div class="button-row">

            <button
                class="btn btn-success"
                onclick="saveAttendance('${studentId}','Present')"
            >
                ✓ Present
            </button>

            <button
                class="btn btn-danger"
                onclick="saveAttendance('${studentId}','Absent')"
            >
                ✕ Absent
            </button>

        </div>
    `);
}


function saveAttendance(studentId, status) {

    db.attendance.push({

        id:
            "ATT-" +
            Date.now(),

        studentId,

        status,

        date:
            new Date().toISOString()
    });

    saveDatabase();

    closeModal();

    renderPage("attendance");

    showToast(
        "Attendance Saved",
        status,
        "success"
    );
}


function getMyAttendance() {

    return db.attendance.filter(
        attendance =>
            attendance.studentId ===
            session?.userId
    );
}


/* =========================================================
   PROFILE
========================================================= */

function renderProfilePage(container) {

    const user =
        getCurrentUser();

    if (!user) return;

    const student =
        db.students.find(
            s =>
                s.userId === user.id
        );

    container.innerHTML = `

        <div class="page-header">

            <div>

                <h3>My Profile</h3>

                <p>
                    Your registered school account.
                </p>

            </div>

            <button
                class="btn btn-primary"
                onclick="openChangePasswordModal()"
            >
                Change Password
            </button>

        </div>

        <div class="content-card">

            <div class="card-body">

                <div class="profile-box">

                    <div class="profile-avatar-large">
                        ${getInitials(user.name)}
                    </div>

                    <div>

                        <h2>
                            ${escapeHTML(user.name)}
                        </h2>

                        <p style="
                            color:var(--purple-light);
                            margin-top:5px;
                        ">
                            ${ROLES[user.role].label}
                        </p>

                    </div>

                </div>

                <div
                    class="profile-details"
                    style="margin-top:25px;"
                >

                    ${detail(
                        "Registered Mobile",
                        user.mobile
                    )}

                    ${detail(
                        "Role",
                        ROLES[user.role].label
                    )}

                    ${detail(
                        "Account Status",
                        user.active ? "Active" : "Inactive"
                    )}

                    ${detail(
                        "Account Created",
                        formatDate(user.createdAt)
                    )}

                    ${
                        student
                        ?
                        `
                        ${detail(
                            "Student ID",
                            student.studentId
                        )}

                        ${detail(
                            "Class",
                            student.className || "-"
                        )}

                        ${detail(
                            "Roll Number",
                            student.rollNumber || "-"
                        )}
                        `
                        :
                        ""
                    }

                </div>

            </div>

        </div>
    `;
}


function openChangePasswordModal() {

    openModal(`

        <div class="modal-title">

            <h2>Change Password</h2>

            <p>
                You can use any password format.
            </p>

        </div>

        <form id="changePasswordForm">

            <div class="form-group">

                <label>Current Password</label>

                <input
                    id="currentPassword"
                    class="form-control"
                    type="password"
                    required
                >

            </div>

            <div class="form-group"
                style="margin-top:15px;">

                <label>New Password</label>

                <input
                    id="newAccountPassword"
                    class="form-control"
                    type="password"
                    required
                >

            </div>

            <div class="form-footer">

                <button
                    class="btn btn-primary"
                    type="submit"
                >
                    Update Password
                </button>

            </div>

        </form>
    `);

    $("changePasswordForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const user =
                getCurrentUser();

            const current =
                $("currentPassword").value;

            const next =
                $("newAccountPassword").value;

            if (user.password !== current) {

                showToast(
                    "Incorrect Password",
                    "Current password is incorrect.",
                    "error"
                );

                return;
            }

            if (!next) {

                showToast(
                    "Invalid Password",
                    "New password cannot be empty.",
                    "error"
                );

                return;
            }

            user.password = next;

            saveDatabase();

            closeModal();

            showToast(
                "Password Changed",
                "Your new password is now active.",
                "success"
            );
        }
    );
}


/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

    const user =
        getCurrentUser();

    openModal(`

        <div class="modal-title">

            <h2>Account Settings</h2>

            <p>
                Manage your portal account.
            </p>

        </div>

        <div class="content-card">

            <div class="card-body">

                <div class="detail-box">

                    <small>Logged in as</small>

                    <strong>
                        ${escapeHTML(user.name)}
                    </strong>

                </div>

                <div
                    class="detail-box"
                    style="margin-top:10px;"
                >

                    <small>Role</small>

                    <strong>
                        ${ROLES[user.role].label}
                    </strong>

                </div>

                <div
                    class="detail-box"
                    style="margin-top:10px;"
                >

                    <small>Registered Mobile</small>

                    <strong>
                        ${escapeHTML(user.mobile)}
                    </strong>

                </div>

                <div
                    class="button-row"
                    style="margin-top:20px;"
                >

                    <button
                        class="btn btn-primary"
                        onclick="closeModal(); openChangePasswordModal();"
                    >
                        Change Password
                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="closeModal(); logout();"
                    >
                        Logout
                    </button>

                </div>

            </div>

        </div>
    `);
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function openNotifications() {

    openModal(`

        <div class="modal-title">

            <h2>Notifications</h2>

            <p>
                Portal notifications.
            </p>

        </div>

        ${
            db.notifications.length
            ?
            db.notifications.map(n => `

                <div class="detail-box"
                    style="margin-bottom:10px;">

                    <strong>
                        ${escapeHTML(n.title)}
                    </strong>

                    <p style="
                        color:var(--text-secondary);
                        margin-top:5px;
                        font-size:12px;
                    ">
                        ${escapeHTML(n.message)}
                    </p>

                </div>

            `).join("")
            :
            `
            <div class="empty-state">
                <div class="empty-icon">🔔</div>
                <strong>No notifications</strong>
                <span>You are all caught up.</span>
            </div>
            `
        }
    `);
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    localStorage.removeItem(SESSION_KEY);

    session = null;

    currentPage = "dashboard";

    $("mainApplication").classList.add(
        "hidden"
    );

    $("loginScreen").classList.remove(
        "hidden"
    );

    $("loginForm").classList.remove(
        "hidden"
    );

    $("loginForm").reset();

    $("otpBox")?.remove();

    hideLoginError();

    showToast(
        "Logged Out",
        "You have been safely logged out.",
        "success"
    );
}


/* =========================================================
   MODAL
========================================================= */

function openModal(content) {

    $("modalContent").innerHTML =
        content;

    $("modalOverlay")
        .classList.remove("hidden");
}


function closeModal() {

    $("modalOverlay")
        .classList.add("hidden");

    $("modalContent").innerHTML = "";
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message,
    type = "success",
    duration = 4500
) {

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.innerHTML = `

        <strong>
            ${escapeHTML(title)}
        </strong>

        <p>
            ${escapeHTML(message)}
        </p>
    `;

    $("toastContainer").appendChild(
        toast
    );

    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform =
            "translateX(30px)";

        setTimeout(
            () => toast.remove(),
            300
        );

    }, duration);
}


/* =========================================================
   LOGIN ERROR
========================================================= */

function showLoginError(message) {

    const element =
        $("loginError");

    element.textContent =
        message;

    element.classList.remove(
        "hidden"
    );
}


function hideLoginError() {

    $("loginError")
        .classList.add("hidden");
}


/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function togglePassword() {

    const input =
        $("loginPassword");

    if (input.type === "password") {

        input.type = "text";

        $("togglePassword").textContent =
            "🙈";

    } else {

        input.type = "password";

        $("togglePassword").textContent =
            "👁";
    }
}


/* =========================================================
   HELPERS
========================================================= */

function getInitials(name) {

    return String(name || "User")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            word =>
                word.charAt(0).toUpperCase()
        )
        .join("");
}


function getUserName(id) {

    const user =
        db.users.find(
            item => item.id === id
        );

    return user
        ? escapeHTML(user.name)
        : "-";
}


function detail(label, value) {

    return `

        <div class="detail-box">

            <small>
                ${escapeHTML(label)}
            </small>

            <strong>
                ${escapeHTML(value || "-")}
            </strong>

        </div>
    `;
}


function formatDate(date) {

    if (!date) return "-";

    try {

        return new Date(date)
            .toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    } catch {

        return "-";
    }
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

    return escapeHTML(value);
}


/* =========================================================
   GLOBAL FUNCTIONS
   Needed by inline buttons
========================================================= */

window.openCreateUserModal =
    openCreateUserModal;

window.openEditUserModal =
    openEditUserModal;

window.removeUser =
    removeUser;

window.viewStudent =
    viewStudent;

window.openBusModal =
    openBusModal;

window.removeBus =
    removeBus;

window.openFeeSettings =
    openFeeSettings;

window.openNoticeModal =
    openNoticeModal;

window.removeNotice =
    removeNotice;

window.markAttendance =
    markAttendance;

window.saveAttendance =
    saveAttendance;

window.closeModal =
    closeModal;

window.openChangePasswordModal =
    openChangePasswordModal;

window.logout =
    logout;