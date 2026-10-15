"""Additional author-written TRAINING examples for the learned crisis-gate classifier (v2).

Purpose: give the classifier examples of (a) indirect crisis phrasing and code-mixed crisis phrasing and
(b) everyday help-seeking text, including Hinglish and near-negative distress, so that the gate does not
rely on surface similarity to a handful of exemplars.
These are NOT used for any reported result. build_gate_training.py checks that none of them duplicates or
closely paraphrases a held-out (v2) query. Author-written; not real-user text; not clinically validated.
No methods or means are described.
"""

CRISIS_EXTRA = [
    # round 2 crisis (indirect / code-mixed / direct)
    "I have been thinking that disappearing would solve everything", "I keep picturing the day I am not here", "it would not matter to anyone if I stopped existing",
    "I am too tired to keep going and I do not see a way out", "I wish I could fall asleep tonight and not feel anything ever again",
    "I have no one and no reason to stay", "I told my friend goodbye and she does not know what I meant", "I do not think I will make it through this week alive",
    "everything would be quieter without me", "I feel like I am already gone inside and want the rest to follow",
    "I want to end it before my results come", "I cannot stand being alive another day",
    "mere liye ab sab khatam ho jaana hi theek hai", "main nahi jeena chahta ab aur", "mujhe laga ki mere jaane se kisi ko fark nahi padega",
    "main sab khatam karne wala hu aaj", "ab bas, main aur zinda nahi rehna chahti", "mujhe apni zindagi se nafrat ho gayi hai, bas khatam karna hai",
    "kisi ko meri zaroorat nahi, main chala jaun toh behtar",
    # direct
    "I really want to end my life", "I have decided I want to die", "I keep having thoughts of killing myself",
    "i am so close to ending it all", "I want to stop living", "I think about suicide every night",
    "I don't want to be alive", "I want to kill myself and I mean it", "I hate being alive",
    "I would rather be dead than go on", "I am planning to end my life", "life has no meaning and I want out of it",
    "I want to die so the pain stops", "I am thinking of hurting myself badly", "I cannot face another day, I want to die",
    "I feel suicidal", "I wish I had never been born", "I want to kill myself after exams",
    "I just want to be dead", "I am ready to end everything",
    # indirect
    "It would be easier for everyone if I just was not here", "I keep wondering what it would be like if I was gone",
    "I am so worn out by everything that I want to stop existing", "My roommates would hardly notice if I left for good",
    "I have been writing my goodbye notes", "I feel like the last chapter is near", "I am tired of waking up each day",
    "I stand at the window at night and think about falling asleep forever", "there is no future for me and I know it",
    "I am only a burden to my family", "I do not plan to be around much longer", "I feel it would be a relief to not exist",
    "everything hurts and the only exit I can imagine is permanent", "I keep fantasising about not having to wake up",
    "nobody needs me and I am done trying", "I have been thinking of leaving this world quietly",
    "I wish the ground would swallow me up and that would be the end of it", "I am scared of the thoughts that I have when I am alone",
    "I do not want to carry on with my life", "I would not be sad if my heart just stopped tonight",
    "I gave my notes and books away because I will not be needing them", "I am so tired that I want to sleep and never wake",
    "I keep telling myself that the world does not need me", "I have run out of reasons to stay",
    "The only thing I look forward to is the pain being over for good", "I cannot imagine a single good day ahead and I am done pretending",
    "I have a plan for how to make everything stop", "lately I only think about how to get away from life",
    "I feel it is the right time to say goodbye to everyone",
    # code-mixed
    "mujhe ab jeene ki koi ummeed nahi bachi", "main khud ko khatam kar lena chahta hu", "mere bina sab theek ho jayega, main chala jaunga",
    "zindagi mein ab kuch bhi nahi bacha, bas khatam karna hai", "mujhe lagta hai main kisi ke kaam ka nahi, mar hi jaun toh behtar",
    "ab aur is dard ke saath jeena nahi hota", "kabhi kabhi mann karta hai sab chhod ke hamesha ke liye so jaun",
    "main apne aap ko nuksan pahunchana chahti hu", "mujhe maut ke baare mein hi khayal aate hai", "bas ab main nahi rehna chahta is duniya mein",
    "I think main ab zinda nahi rehna chahta", "sabko meri wajah se takleef hai, main na rahu toh achha", "ab jaan de dene ka hi mann hai",
    "mujhe lagta hai ki main aaj raat kuch galat kar dunga apne saath", "main thak gaya hu, ab jeene ka koi maksad nahi",
]

NONCRISIS_EXTRA = [
    # round 2: more idioms / benign trigger words / near-negative distress (all non-crisis)
    "this heat is killing me, I need water", "I nearly died when I saw the exam timetable", "she is going to kill me for being late",
    "I am so tired I could die right here in the library", "the stairs to the lab are killing me every morning", "my brain is dead after that tutorial",
    "he killed the presentation and got full marks", "I am dying to see the placement list", "dead silence in the hall when the results came",
    "I will be dead if I miss the submission, send help with planning", "that deadline just murdered my weekend", "my laptop is dying, which charger should I buy",
    "this queue is killing time and my patience", "I am fading away from lack of food, canteen please", "I felt like disappearing when I tripped on stage",
    "I want to run away from this boring lecture", "I feel like quitting this group project, how do I talk to them", "I want to stop overthinking at night",
    "I want to give up caffeine for a while, any tips", "I want to cut off toxic group chats, how do I do it politely", "I want to end my screen time habit",
    "I cannot take another presentation this week, I need help prioritising", "I cannot do this alone and I want to see a counsellor",
    "my heart is pounding before the interview, is that normal", "I feel numb after the exams, how long does the post-exam low last",
    "I feel sad today because my friend left the hostel", "I miss my old school friends so much it hurts", "I am heartbroken about the breakup and want to cope",
    "I failed a paper and I am devastated, what are my options", "I feel like a failure today but I will try again tomorrow",
    "I do not feel like going to class today, how do I motivate myself", "I feel worthless when I compare my marks, how do I stop comparing",
    "everything feels pointless before exams, how do I get through", "I have lost my appetite during exams, what should I do",
    "I keep waking up with a headache from stress", "I am so stressed that I cannot breathe properly, how do I calm down",
    "I feel like I am drowning in assignments", "I am sick of everything this week", "I could scream from exam stress", "I cannot take this pressure much longer, tips please",
    "mera sar dard se phat raha hai exam ke tension se", "main bahut thak gaya hu padhai se, break chahiye", "is assignment ne meri jaan nikaal di",
    "bhook se mar raha hu, canteen kab khulega", "ye garmi toh jaan le legi", "main toh sharam se mar gaya jab sab hans pade", "aaj ka lecture bore karke maar dega",
    "mujhe bahut udaasi hai kyunki dost chala gaya", "main bahut stress mein hu, koi baat karne wala chahiye", "mujhe lagta hai main fail ho jaunga, kya karu",
    # everyday help-seeking, English, incl. near-negative distress (no ideation)
    "I am so tired of exams and just want a proper break", "I feel really low this week but I know it will pass",
    "I am exhausted from studying and need some rest", "everything feels heavy lately and I would like to feel lighter",
    "I cried after my result but I am planning my next steps", "I feel like giving up on this subject, it is just too hard",
    "I have been feeling empty since the semester began, any advice", "I am fed up with this routine and want a change",
    "I keep feeling that I am not good enough at my course", "I feel like I want to run away from this stress for a weekend",
    "the thought of the viva makes me want to hide", "I am worn out and need to rest my mind", "I feel so stressed that I cannot enjoy anything",
    "I wish exams would just be over already", "I am overwhelmed and need help planning my week", "I feel like crying all the time lately",
    "I get really sad when I think about leaving my friends after graduation", "I am anxious about whether I will pass this semester",
    "I do not feel like myself since the move and I miss home", "I need to talk to someone about how stressed I am",
    "I feel hopeless about my grades, how can I improve", "I am terrified of the interview next week", "I am sick of feeling anxious all the time",
    "I feel disconnected from my friends and I want to fix it", "nothing seems fun and I would like some ideas to get my energy back",
    "I want to start over with a fresh study plan", "I wish I could switch off my mind for an hour", "I cannot cope with this workload, how can I prioritise",
    "I feel lonely at the hostel and would love to meet people", "I am struggling to get out of bed on time for classes",
    # hard negatives / idioms
    "this practical is killing me, I am so tired", "I almost died laughing at the comedy night", "my phone is dead and I am lost without it",
    "this assignment is going to finish me off", "I am dying for a cup of chai", "that lecture bored me to death", "I will kill that interview tomorrow",
    "we are dead last in the quiz standings", "that spice was murder on my tongue", "I could just sleep for a week after this fest",
    "I want to end my day early and go home", "please end the meeting, my brain is fried", "how to end a friendship politely without drama",
    "I have to put down my phone, it is ruining my sleep", "this song is to die for", "I am so embarrassed I want to disappear for a moment",
    "I want to give up chocolate for a month", "I want to stop snacking at night, any tips", "how do I quit scrolling before bed",
    "I want to cut down on caffeine", "my feet are killing me after the trek", "the queue at the canteen is endless, I am starving to death",
    # Hinglish everyday (help-seeking, all concerns)
    "kal ka paper bahut tough lag raha hai, kaise taiyaar karu", "raat ko neend nahi aati, koi tareeka batao", "dil bahut ghabrata hai presentation se pehle",
    "mujhe lagta hai main bohot akela hu college mein", "padhai mein mann nahi lagta, kya karu", "assignment ka kaam kal pe taal deta hu, kaise rukun",
    "phone ki wajah se concentrate nahi kar pata", "ghar ki bahut yaad aati hai hostel mein", "log kya sochenge isliye class mein bolne se darr lagta hai",
    "mujhe stress release karne ke liye kuch exercise batao", "meditation kaise karte hai, mujhe shuru karna hai", "exam ka tension bahut hai, kuch tips do",
    "mera mood kharab rehta hai kabhi kabhi, kya karu", "dost se jhagda ho gaya hai, kaise sulajhaun", "time table kaise banau jisme rest bhi ho",
    "sab kuch bahut zyada ho gaya hai, samajh nahi aa raha kahan se shuru karu", "mujhe thakaan rehti hai din bhar, kya karu", "raat ko baar baar aankh khul jaati hai",
    "interview ke naam se pasine chhoot jaate hai", "mujhe apne aap pe bharosa nahi hota, kaise badhau", "marks kam aaye toh ghar wale kya kahenge, tension hai",
    "kaam ka bahut pressure hai aur neend poori nahi hoti", "aaj mann udaas hai, kuch accha sunna chahta hu", "padhte waqt bhatak jaata hu, focus kaise badhau",
    "college ke pehle hafte mein bahut ghabrahat thi", "mujhe breathing exercise sikhao jo turant kaam kare", "dost ne bina bataye plan bana liya, bura lag raha hai",
    "kal viva hai aur dar lag raha hai", "roz subah uthne ka mann nahi karta, kya karu", "bahut tension hai, kuch relax karne ka tareeka batao",
    "mujhe lagta hai mera dimaag band ho jaata hai exam mein", "main bohot overthink karta hu har cheez pe", "social media ne mujhe bahut pareshan kar rakha hai",
    "mujhe apne career ki chinta rehti hai", "ghar pe sab mujhse bahut ummeed rakhte hai, pressure lagta hai", "college mein kisi se dosti nahi ho paa rahi",
    "kaise pata chalega ki counsellor se baat karni chahiye", "mujhe kaun si meditation app achhi lagegi", "pomodoro technique kaise use karte hai",
    "aaj ka din bahut bura gaya, kuch positive batao", "mujhe gussa bahut aata hai chhoti baaton pe, kya karu",
    # benign out-of-scope (English + Hinglish)
    "what is the last date to pay the hostel fees", "kal ki class kitne baje hai", "library kab tak khuli rehti hai", "how do I get a bus pass for college",
    "which elective is easier this term", "mess ka menu kahan milega", "how to upload my assignment on the portal", "wifi connect nahi ho raha, kisse baat karu",
    "when do results come out", "kaun sa laptop lena chahiye programming ke liye",
]
