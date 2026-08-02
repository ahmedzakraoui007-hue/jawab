import type { Locale } from '@/i18n/config';

export interface LegalSection {
    heading: string;
    body: string[];
}

export interface LegalDoc {
    title: string;
    lastUpdated: string;
    intro: string;
    sections: LegalSection[];
}

export const TERMS: Record<Locale, LegalDoc> = {
    en: {
        title: 'Terms of Service',
        lastUpdated: 'Last updated: August 2026',
        intro:
            'Welcome to Jawab. These Terms of Service ("Terms") govern your access to and use of the Jawab platform, websites, and related services (collectively, the "Service") operated by Jawab Technologies ("Jawab," "we," "us," or "our"). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, please do not use the Service.',
        sections: [
            {
                heading: '1. Description of the Service',
                body: [
                    'Jawab provides an AI-powered virtual receptionist that responds to customer messages and calls across WhatsApp, voice, and Instagram on behalf of your business, including answering questions, providing information, and scheduling appointments via connected calendar integrations. The Service is provided on a subscription basis as described in Section 3.',
                ],
            },
            {
                heading: '2. Eligibility and Account Registration',
                body: [
                    'You must be at least 18 years old and have the authority to bind the business you represent to use the Service. You agree to provide accurate registration information and to keep your account credentials secure; you are responsible for all activity under your account.',
                ],
            },
            {
                heading: '3. Subscription Plans, Billing, and Free Trial',
                body: [
                    'Jawab offers Starter, Professional, and Business subscription plans, billed monthly or annually, in your selected currency (AED, SAR, QAR, KWD, BHD, or OMR). New accounts may be eligible for a 14-day free trial; unless cancelled before the trial ends, your subscription will convert to a paid plan and be billed automatically.',
                    "Fees are non-refundable except as required by law or expressly stated at checkout. We may change prices with at least 30 days' notice before your next billing cycle.",
                ],
            },
            {
                heading: '4. Acceptable Use',
                body: [
                    'You agree not to use the Service to send unsolicited messages (spam), impersonate any person or entity, violate any applicable law, or interfere with the operation of the Service. We may suspend or terminate accounts that violate this section.',
                ],
            },
            {
                heading: '5. Your Content and Data',
                body: [
                    'You retain ownership of the business information, customer conversation data, and other content you submit to or generate through the Service ("Customer Content"). You grant Jawab a limited license to process Customer Content solely to provide and improve the Service.',
                    'You are responsible for ensuring you have the necessary rights and consents from your own customers to have their communications processed by Jawab.',
                ],
            },
            {
                heading: '6. AI-Generated Responses',
                body: [
                    'The Service uses artificial intelligence to generate responses and take actions such as booking appointments. While we work to make these responses accurate and helpful, AI-generated content may occasionally be incorrect, incomplete, or inappropriate.',
                    'You are responsible for reviewing critical business communications and configuring the Service, including handoff to a human team member, in a way appropriate for your business.',
                ],
            },
            {
                heading: '7. Third-Party Services',
                body: [
                    'The Service integrates with third-party providers, including but not limited to Twilio (messaging and voice), Meta (WhatsApp and Instagram), Google (Calendar and authentication), and ElevenLabs (voice synthesis). Your use of the Service is also subject to the applicable terms of these providers, and Jawab is not responsible for their acts or omissions.',
                ],
            },
            {
                heading: '8. Intellectual Property',
                body: [
                    "Jawab and its licensors retain all right, title, and interest in the Service, including its software, design, and trademarks. Nothing in these Terms grants you any right to use Jawab's trademarks or branding without our prior written consent.",
                ],
            },
            {
                heading: '9. Termination',
                body: [
                    'You may cancel your subscription at any time from your account settings; cancellation takes effect at the end of your current billing period. We may suspend or terminate your access to the Service if you breach these Terms, fail to pay applicable fees, or if we discontinue the Service, with notice where reasonably practicable.',
                ],
            },
            {
                heading: '10. Disclaimer of Warranties',
                body: [
                    'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will be uninterrupted, error-free, or fully secure.',
                ],
            },
            {
                heading: '11. Limitation of Liability',
                body: [
                    "To the maximum extent permitted by law, Jawab's total liability arising out of or related to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim, and Jawab shall not be liable for any indirect, incidental, special, or consequential damages.",
                ],
            },
            {
                heading: '12. Indemnification',
                body: [
                    'You agree to indemnify and hold Jawab harmless from any claims, damages, or expenses arising from your use of the Service, your Customer Content, or your violation of these Terms or applicable law.',
                ],
            },
            {
                heading: '13. Governing Law and Disputes',
                body: [
                    'These Terms are governed by the laws of the United Arab Emirates, without regard to conflict-of-law principles. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the competent courts of the United Arab Emirates, unless otherwise required by mandatory local law.',
                ],
            },
            {
                heading: '14. Changes to These Terms',
                body: [
                    'We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
                ],
            },
            {
                heading: '15. Contact Us',
                body: ['If you have questions about these Terms, please contact us at legal@jawab.ai.'],
            },
        ],
    },
    ar: {
        title: 'شروط الخدمة',
        lastUpdated: 'آخر تحديث: أغسطس 2026',
        intro:
            'مرحباً بك في جواب. تحكم شروط الخدمة هذه ("الشروط") وصولك إلى واستخدامك لمنصة جواب والمواقع الإلكترونية والخدمات ذات الصلة (يُشار إليها مجتمعة بـ"الخدمة") التي تُشغّلها شركة جواب تكنولوجيز ("جواب" أو "نحن" أو "لنا"). بإنشائك لحساب أو استخدامك للخدمة، فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق عليها، يُرجى عدم استخدام الخدمة.',
        sections: [
            {
                heading: '١. وصف الخدمة',
                body: [
                    'يوفر جواب موظف استقبال افتراضياً مدعوماً بالذكاء الاصطناعي يرد على رسائل ومكالمات العملاء عبر واتساب والمكالمات الصوتية وإنستغرام نيابة عن عملك، بما في ذلك الإجابة عن الأسئلة وتقديم المعلومات وجدولة المواعيد عبر تكاملات التقويم المرتبطة. تُقدَّم الخدمة على أساس اشتراك كما هو موضح في القسم 3.',
                ],
            },
            {
                heading: '٢. الأهلية وتسجيل الحساب',
                body: [
                    'يجب أن يكون عمرك 18 عاماً على الأقل وأن تملك الصلاحية لإلزام العمل الذي تمثله باستخدام الخدمة. أنت توافق على تقديم معلومات تسجيل دقيقة والحفاظ على سرية بيانات حسابك؛ وأنت مسؤول عن جميع الأنشطة التي تتم من خلال حسابك.',
                ],
            },
            {
                heading: '٣. خطط الاشتراك والفوترة والتجربة المجانية',
                body: [
                    'يقدم جواب خطط اشتراك الأساسية والاحترافية والأعمال، تُفوتَر شهرياً أو سنوياً، بالعملة التي تختارها (درهم إماراتي، ريال سعودي، ريال قطري، دينار كويتي، دينار بحريني، أو ريال عماني). قد تكون الحسابات الجديدة مؤهلة لتجربة مجانية لمدة 14 يوماً؛ وما لم يتم الإلغاء قبل انتهاء التجربة، سيتحول اشتراكك إلى خطة مدفوعة وستتم فوترتها تلقائياً.',
                    'الرسوم غير قابلة للاسترداد إلا إذا تطلب القانون ذلك أو نُصَّ عليه صراحةً عند الدفع. يجوز لنا تغيير الأسعار بإشعار مسبق لا يقل عن 30 يوماً قبل دورة الفوترة التالية.',
                ],
            },
            {
                heading: '٤. الاستخدام المقبول',
                body: [
                    'أنت توافق على عدم استخدام الخدمة لإرسال رسائل غير مرغوب فيها (بريد عشوائي)، أو انتحال شخصية أي فرد أو كيان، أو مخالفة أي قانون معمول به، أو التدخل في تشغيل الخدمة. يجوز لنا تعليق أو إنهاء الحسابات التي تخالف هذا القسم.',
                ],
            },
            {
                heading: '٥. محتواك وبياناتك',
                body: [
                    'تحتفظ بملكية معلومات عملك وبيانات محادثات العملاء والمحتوى الآخر الذي تقدمه إلى الخدمة أو تُنشئه من خلالها ("محتوى العميل"). أنت تمنح جواب ترخيصاً محدوداً لمعالجة محتوى العميل فقط لغرض تقديم الخدمة وتحسينها.',
                    'أنت مسؤول عن ضمان حصولك على الحقوق والموافقات اللازمة من عملائك للسماح بمعالجة اتصالاتهم عبر جواب.',
                ],
            },
            {
                heading: '٦. الردود المُولَّدة بالذكاء الاصطناعي',
                body: [
                    'تستخدم الخدمة الذكاء الاصطناعي لتوليد الردود واتخاذ إجراءات مثل حجز المواعيد. وبينما نعمل على جعل هذه الردود دقيقة ومفيدة، فقد تكون بعض الردود المُولَّدة بالذكاء الاصطناعي غير دقيقة أو ناقصة أو غير ملائمة في بعض الأحيان.',
                    'أنت مسؤول عن مراجعة الاتصالات التجارية الهامة وضبط إعدادات الخدمة، بما في ذلك التحويل إلى أحد أفراد فريقك، بما يناسب طبيعة عملك.',
                ],
            },
            {
                heading: '٧. خدمات الطرف الثالث',
                body: [
                    'تتكامل الخدمة مع مزودي خدمات من أطراف ثالثة، منهم على سبيل المثال لا الحصر Twilio (الرسائل والمكالمات الصوتية)، وMeta (واتساب وإنستغرام)، وGoogle (التقويم والمصادقة)، وElevenLabs (توليد الصوت). يخضع استخدامك للخدمة أيضاً للشروط المعمول بها لدى هؤلاء المزودين، ولا يتحمل جواب مسؤولية أفعالهم أو تقصيرهم.',
                ],
            },
            {
                heading: '٨. الملكية الفكرية',
                body: [
                    'يحتفظ جواب والجهات المرخِّصة له بجميع الحقوق والملكية في الخدمة، بما في ذلك برمجياتها وتصميمها وعلاماتها التجارية. لا يمنحك أي بند في هذه الشروط أي حق في استخدام علامات جواب التجارية أو هويته دون موافقة كتابية مسبقة منا.',
                ],
            },
            {
                heading: '٩. الإنهاء',
                body: [
                    'يمكنك إلغاء اشتراكك في أي وقت من إعدادات حسابك؛ ويسري الإلغاء اعتباراً من نهاية دورة الفوترة الحالية. يجوز لنا تعليق أو إنهاء وصولك إلى الخدمة في حال مخالفتك لهذه الشروط، أو عدم سداد الرسوم المستحقة، أو في حال توقفنا عن تقديم الخدمة، مع تقديم إشعار حيثما أمكن ذلك عملياً.',
                ],
            },
            {
                heading: '١٠. إخلاء المسؤولية عن الضمانات',
                body: [
                    'تُقدَّم الخدمة "كما هي" و"حسب توفرها" دون أي ضمانات من أي نوع، صريحة كانت أو ضمنية، بما في ذلك ضمانات القابلية للتسويق أو الملاءمة لغرض معين أو عدم الانتهاك. نحن لا نضمن أن تكون الخدمة خالية من الانقطاع أو الأخطاء أو آمنة بشكل كامل.',
                ],
            },
            {
                heading: '١١. تحديد المسؤولية',
                body: [
                    'إلى أقصى حد يسمح به القانون، لن تتجاوز مسؤولية جواب الإجمالية الناشئة عن هذه الشروط أو الخدمة المبلغ الذي دفعته لنا خلال الاثني عشر (12) شهراً السابقة للمطالبة، ولن يكون جواب مسؤولاً عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية.',
                ],
            },
            {
                heading: '١٢. التعويض',
                body: [
                    'أنت توافق على تعويض جواب وإبرائه من أي مطالبات أو أضرار أو نفقات ناشئة عن استخدامك للخدمة، أو محتوى العميل الخاص بك، أو مخالفتك لهذه الشروط أو للقانون المعمول به.',
                ],
            },
            {
                heading: '١٣. القانون الحاكم والنزاعات',
                body: [
                    'تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة، دون اعتبار لمبادئ تنازع القوانين. تخضع أي نزاعات ناشئة عن هذه الشروط للاختصاص القضائي الحصري للمحاكم المختصة في دولة الإمارات العربية المتحدة، ما لم يقتض القانون المحلي الإلزامي خلاف ذلك.',
                ],
            },
            {
                heading: '١٤. التغييرات على هذه الشروط',
                body: [
                    'يجوز لنا تحديث هذه الشروط من وقت لآخر. سنُخطرك بالتغييرات الجوهرية من خلال نشر الشروط المحدَّثة على هذه الصفحة وتحديث تاريخ "آخر تحديث". يُعد استمرارك في استخدام الخدمة بعد سريان التغييرات بمثابة قبول للشروط المُعدَّلة.',
                ],
            },
            {
                heading: '١٥. تواصل معنا',
                body: ['إذا كانت لديك أي أسئلة حول هذه الشروط، يُرجى التواصل معنا عبر legal@jawab.ai.'],
            },
        ],
    },
};

export const PRIVACY: Record<Locale, LegalDoc> = {
    en: {
        title: 'Privacy Policy',
        lastUpdated: 'Last updated: August 2026',
        intro:
            'This Privacy Policy explains how Jawab Technologies ("Jawab," "we," "us," or "our") collects, uses, shares, and protects information when you use our website, dashboard, and AI receptionist services (collectively, the "Service"). This policy applies to both business account holders and the end customers who message or call a business using Jawab.',
        sections: [
            {
                heading: '1. Information We Collect',
                body: [
                    'We collect information you provide directly, such as your name, email, phone number, and business details when you create an account; content processed through the Service, including customer messages, call transcripts and recordings, and calendar/booking data; and technical information such as device, log, and usage data collected automatically when you use our website or dashboard.',
                ],
            },
            {
                heading: '2. How We Use Information',
                body: [
                    'We use collected information to provide, operate, and improve the Service; to generate AI responses on behalf of your business; to process payments and manage subscriptions; to communicate with you about your account; to monitor for abuse and ensure security; and to comply with legal obligations.',
                ],
            },
            {
                heading: '3. Legal Basis for Processing',
                body: [
                    'Where applicable data protection law requires it, we process personal data on the basis of your consent, the performance of our contract with you, our legitimate interests in operating and improving the Service, and compliance with legal obligations.',
                ],
            },
            {
                heading: '4. How We Share Information',
                body: [
                    'We share information with third-party service providers who help us operate the Service, including Twilio (messaging/voice delivery), Meta (WhatsApp and Instagram messaging), Google (Calendar integration, authentication, and cloud infrastructure via Firebase), and ElevenLabs (voice synthesis). These providers are only authorized to use your information as necessary to provide their services to us. We do not sell your personal information.',
                ],
            },
            {
                heading: '5. Data Retention',
                body: [
                    'We retain account and Customer Content data for as long as your account is active or as needed to provide the Service, and for a reasonable period afterward to comply with legal obligations, resolve disputes, and enforce our agreements. You may request deletion of your data as described in Section 8.',
                ],
            },
            {
                heading: '6. Data Security',
                body: [
                    'We use administrative, technical, and physical safeguards designed to protect information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
                ],
            },
            {
                heading: '7. International Data Transfers',
                body: [
                    'Your information may be processed and stored in countries other than your own, including by our third-party service providers located outside the UAE. Where required, we take steps to ensure such transfers are subject to appropriate safeguards.',
                ],
            },
            {
                heading: '8. Your Rights',
                body: [
                    'Depending on your location, you may have rights to access, correct, delete, or receive a copy of your personal information, and to object to or restrict certain processing. To exercise these rights, contact us at privacy@jawab.ai; we will respond within a reasonable timeframe and in accordance with applicable law.',
                ],
            },
            {
                heading: '9. Cookies and Tracking',
                body: [
                    'Our website and dashboard use cookies and similar technologies to keep you signed in, remember your language and currency preferences, and understand how the Service is used. You can control cookies through your browser settings, though disabling them may affect functionality.',
                ],
            },
            {
                heading: "10. Children's Privacy",
                body: [
                    'The Service is intended for business use and is not directed at children. We do not knowingly collect personal information from children under 16.',
                ],
            },
            {
                heading: '11. Changes to This Policy',
                body: [
                    'We may update this Privacy Policy from time to time. We will indicate the date of the latest revision at the top of this page and, where changes are material, provide additional notice.',
                ],
            },
            {
                heading: '12. Contact Us',
                body: [
                    'If you have questions about this Privacy Policy or how we handle your information, please contact us at privacy@jawab.ai.',
                ],
            },
        ],
    },
    ar: {
        title: 'سياسة الخصوصية',
        lastUpdated: 'آخر تحديث: أغسطس 2026',
        intro:
            'توضح سياسة الخصوصية هذه كيفية قيام شركة جواب تكنولوجيز ("جواب" أو "نحن" أو "لنا") بجمع المعلومات واستخدامها ومشاركتها وحمايتها عند استخدامك لموقعنا الإلكتروني ولوحة التحكم وخدمات موظف الاستقبال الذكي (يُشار إليها مجتمعة بـ"الخدمة"). تنطبق هذه السياسة على أصحاب حسابات الأعمال وعلى العملاء النهائيين الذين يراسلون أو يتصلون بعمل تجاري يستخدم جواب.',
        sections: [
            {
                heading: '١. المعلومات التي نجمعها',
                body: [
                    'نجمع المعلومات التي تقدمها مباشرةً، مثل اسمك وبريدك الإلكتروني ورقم هاتفك وتفاصيل عملك عند إنشاء حساب؛ والمحتوى الذي تتم معالجته عبر الخدمة، بما في ذلك رسائل العملاء ونصوص وتسجيلات المكالمات وبيانات التقويم والحجوزات؛ والمعلومات التقنية مثل بيانات الجهاز والسجلات والاستخدام التي تُجمع تلقائياً عند استخدامك لموقعنا أو لوحة التحكم.',
                ],
            },
            {
                heading: '٢. كيفية استخدامنا للمعلومات',
                body: [
                    'نستخدم المعلومات المجمَّعة لتقديم الخدمة وتشغيلها وتحسينها؛ ولتوليد ردود الذكاء الاصطناعي نيابة عن عملك؛ ولمعالجة المدفوعات وإدارة الاشتراكات؛ وللتواصل معك بشأن حسابك؛ ولمراقبة إساءة الاستخدام وضمان الأمان؛ وللامتثال للالتزامات القانونية.',
                ],
            },
            {
                heading: '٣. الأساس القانوني للمعالجة',
                body: [
                    'حيثما يتطلب قانون حماية البيانات المعمول به ذلك، نعالج البيانات الشخصية استناداً إلى موافقتك، وتنفيذ عقدنا معك، ومصالحنا المشروعة في تشغيل الخدمة وتحسينها، والامتثال للالتزامات القانونية.',
                ],
            },
            {
                heading: '٤. كيفية مشاركتنا للمعلومات',
                body: [
                    'نشارك المعلومات مع مزودي خدمات من أطراف ثالثة يساعدوننا في تشغيل الخدمة، بما في ذلك Twilio (تسليم الرسائل والمكالمات الصوتية)، وMeta (رسائل واتساب وإنستغرام)، وGoogle (تكامل التقويم والمصادقة والبنية التحتية السحابية عبر Firebase)، وElevenLabs (توليد الصوت). هؤلاء المزودون مخوَّلون فقط باستخدام معلوماتك بالقدر اللازم لتقديم خدماتهم لنا. نحن لا نبيع معلوماتك الشخصية.',
                ],
            },
            {
                heading: '٥. الاحتفاظ بالبيانات',
                body: [
                    'نحتفظ ببيانات الحساب ومحتوى العميل طوال فترة نشاط حسابك أو بالقدر اللازم لتقديم الخدمة، ولفترة معقولة بعد ذلك للامتثال للالتزامات القانونية وحل النزاعات وإنفاذ اتفاقياتنا. يمكنك طلب حذف بياناتك كما هو موضح في القسم 8.',
                ],
            },
            {
                heading: '٦. أمان البيانات',
                body: [
                    'نستخدم ضمانات إدارية وتقنية ومادية مصممة لحماية المعلومات من الوصول غير المصرح به أو الإفصاح أو التغيير أو الإتلاف. ومع ذلك، لا توجد طريقة نقل أو تخزين آمنة بشكل كامل، ولا يمكننا ضمان الأمان المطلق.',
                ],
            },
            {
                heading: '٧. نقل البيانات الدولي',
                body: [
                    'قد تتم معالجة معلوماتك وتخزينها في دول غير دولتك، بما في ذلك لدى مزودي الخدمات من الأطراف الثالثة الموجودين خارج دولة الإمارات العربية المتحدة. وحيثما يقتضي الأمر، نتخذ خطوات لضمان خضوع عمليات النقل هذه لضمانات مناسبة.',
                ],
            },
            {
                heading: '٨. حقوقك',
                body: [
                    'بحسب موقعك، قد يكون لديك الحق في الوصول إلى معلوماتك الشخصية أو تصحيحها أو حذفها أو الحصول على نسخة منها، والاعتراض على معالجتها أو تقييدها في حالات معينة. لممارسة هذه الحقوق، تواصل معنا عبر privacy@jawab.ai؛ وسنرد خلال فترة زمنية معقولة ووفقاً للقانون المعمول به.',
                ],
            },
            {
                heading: '٩. ملفات تعريف الارتباط والتتبع',
                body: [
                    'يستخدم موقعنا ولوحة التحكم ملفات تعريف الارتباط وتقنيات مشابهة لإبقائك مسجلاً للدخول، وتذكر تفضيلات اللغة والعملة الخاصة بك، وفهم كيفية استخدام الخدمة. يمكنك التحكم بملفات تعريف الارتباط من خلال إعدادات متصفحك، رغم أن تعطيلها قد يؤثر على وظائف الخدمة.',
                ],
            },
            {
                heading: '١٠. خصوصية الأطفال',
                body: [
                    'الخدمة مخصصة للاستخدام التجاري وغير موجهة للأطفال. نحن لا نجمع عمداً معلومات شخصية من أطفال دون سن 16 عاماً.',
                ],
            },
            {
                heading: '١١. التغييرات على هذه السياسة',
                body: [
                    'يجوز لنا تحديث سياسة الخصوصية هذه من وقت لآخر. سنشير إلى تاريخ آخر مراجعة في أعلى هذه الصفحة، وسنقدم إشعاراً إضافياً في حال كانت التغييرات جوهرية.',
                ],
            },
            {
                heading: '١٢. تواصل معنا',
                body: [
                    'إذا كانت لديك أي أسئلة حول سياسة الخصوصية هذه أو كيفية تعاملنا مع معلوماتك، يُرجى التواصل معنا عبر privacy@jawab.ai.',
                ],
            },
        ],
    },
};
