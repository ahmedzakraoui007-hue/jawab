export interface Dictionary {
    meta: {
        title: string;
        description: string;
    };
    nav: {
        features: string;
        howItWorks: string;
        testimonials: string;
        pricing: string;
        faq: string;
        login: string;
        getStarted: string;
    };
    hero: {
        badge: string;
        titleLine1: string;
        titleLine2: string;
        subtitle: string;
        ctaPrimary: string;
        ctaSecondary: string;
        statBusinesses: string;
        statResponseTime: string;
        statUptime: string;
    };
    trustBar: {
        label: string;
        names: string[];
    };
    features: {
        heading: string;
        headingAccent: string;
        subheading: string;
        whatsappTitle: string;
        whatsappBody: string;
        voiceTitle: string;
        voiceBody: string;
        instagramTitle: string;
        instagramBody: string;
    };
    howItWorks: {
        heading: string;
        headingAccent: string;
        subheading: string;
        stepLabel: string;
        step1Title: string;
        step1Body: string;
        step2Title: string;
        step2Body: string;
        step3Title: string;
        step3Body: string;
    };
    testimonials: {
        heading: string;
        items: { quote: string; name: string; title: string }[];
    };
    pricing: {
        heading: string;
        headingAccent: string;
        subheading: string;
        monthly: string;
        annual: string;
        save: string;
        perMonth: string;
        billedMonthly: string;
        billedAnnually: string;
        noCreditCard: string;
        cancelAnytime: string;
        freeTrial: string;
        mostPopular: string;
        plans: {
            name: string;
            features: string[];
            cta: string;
        }[];
    };
    faq: {
        heading: string;
        headingAccent: string;
        subheading: string;
        items: { q: string; a: string }[];
    };
    cta: {
        title: string;
        subtitle: string;
        button: string;
    };
    footer: {
        description: string;
        product: string;
        company: string;
        legal: string;
        featuresLink: string;
        pricingLink: string;
        howItWorksLink: string;
        faqLink: string;
        loginLink: string;
        getStartedLink: string;
        customersLink: string;
        privacyLink: string;
        termsLink: string;
        copyright: string;
        tagline: string;
    };
    authLayout: {
        headline: string;
        highlight1: string;
        highlight2: string;
        highlight3: string;
        testimonialQuote: string;
        testimonialAuthor: string;
    };
    login: {
        title: string;
        subtitle: string;
        emailTab: string;
        phoneTab: string;
        emailLabel: string;
        emailPlaceholder: string;
        passwordLabel: string;
        passwordPlaceholder: string;
        rememberMe: string;
        forgotPassword: string;
        googleSignInFailed: string;
        signIn: string;
        phoneLabel: string;
        phonePlaceholder: string;
        phoneHint: string;
        sendOtp: string;
        otpSentTo: string;
        changeNumber: string;
        otpLabel: string;
        verifyAndSignIn: string;
        resendCode: string;
        orContinueWith: string;
        google: string;
        noAccount: string;
        signUpFree: string;
        terms: string;
    };
    signup: {
        title: string;
        subtitle: string;
        nameLabel: string;
        namePlaceholder: string;
        emailPlaceholder: string;
        passwordPlaceholder: string;
        passwordWeak: string;
        passwordFair: string;
        passwordStrong: string;
        agreeText: string;
        agreeTerms: string;
        agreeAnd: string;
        agreePrivacy: string;
        createAccount: string;
        continueWithGoogle: string;
        haveAccount: string;
        signIn: string;
    };
    forgotPassword: {
        title: string;
        subtitle: string;
        emailLabel: string;
        emailPlaceholder: string;
        sendResetLink: string;
        checkInboxTitle: string;
        checkInboxBody: string;
        useDifferentEmail: string;
        backToLogin: string;
    };
    resetPassword: {
        title: string;
        subtitle: string;
        passwordLabel: string;
        passwordPlaceholder: string;
        confirmLabel: string;
        confirmPlaceholder: string;
        submit: string;
        successTitle: string;
        successBody: string;
        goToLogin: string;
        invalidTitle: string;
        invalidBody: string;
        requestNewLink: string;
        passwordMismatch: string;
    };
    validation: {
        nameRequired: string;
        emailRequired: string;
        passwordMinLength: string;
        agreeRequired: string;
        phoneRequired: string;
    };
}
