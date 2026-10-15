"""FRESH HELD-OUT retrieval queries (v2). Author-written, NOT real-user text.

Written after the first test split had been evaluated, WITHOUT using any model output or failure list to choose
wording. Per subtopic: 1 'lex', 2 'para', 1 'mix' (code-mixed Hinglish), 1 'long'. Plus 8 'multi' queries.
None of these may duplicate or closely paraphrase a query in queries.py (checked by build_heldout.py).
This set is sealed (hashes in data/heldout/SEAL.json) and must be evaluated ONCE, after system changes are frozen.
"""

Q = {
    "exam_panic": [
        ("lex", "only one night left to revise for my final paper"),
        ("para", "the entire textbook is still unread and the paper starts at dawn"),
        ("para", "I keep staring at unopened chapters while the hours disappear"),
        ("mix", "exam subah hai aur maine abhi tak kuch shuru bhi nahi kiya"),
        ("long", "My internal starts in the morning and I have a stack of notes I never touched; each time I try to begin, my chest tightens and I switch to something pointless instead"),
    ],
    "exam_day": [
        ("lex", "I panic and forget everything when the test begins"),
        ("para", "seated in front of the question paper my thoughts simply vanish"),
        ("para", "I need a way to settle myself before walking in for a big paper"),
        ("mix", "test hall mein pahunchte hi haath kaanpne lagte hai aur kuch yaad nahi aata"),
        ("long", "I studied for weeks and still, the second the sheet lands on my desk my head goes white and I sit there watching the clock instead of writing anything"),
    ],
    "exam_pressure": [
        ("lex", "afraid my results will let my family down"),
        ("para", "everyone is counting on a top rank from me and it feels crushing"),
        ("para", "my sense of who I am rises and falls with each score"),
        ("mix", "agar marks kam aaye toh papa ko kya jawab dunga, yahi darr lagta hai"),
        ("long", "Everyone in my family talks about the college I am meant to get into, and with every mock test I feel the weight of their hopes getting heavier on my shoulders"),
    ],
    "sleep_onset": [
        ("lex", "I lie awake for hours unable to fall asleep"),
        ("para", "my brain starts replaying embarrassing moments the moment the lights go out"),
        ("para", "bedtime is when every worry arrives and refuses to leave"),
        ("mix", "bistar pe leta rehta hu par neend hi nahi aati, dimaag chalta rehta hai"),
        ("long", "I go to bed at midnight tired, but then my thoughts jump from one thing to another until the sky starts getting light and I have barely slept"),
    ],
    "sleep_schedule": [
        ("lex", "my sleeping hours are completely reversed"),
        ("para", "I stay glued to my phone in bed until the early hours and then oversleep"),
        ("para", "after a week of late nights I cannot return to a normal bedtime"),
        ("mix", "raat bhar jaagta hu aur din mein so jaata hu, schedule bigad gaya hai"),
        ("long", "Since the project deadline I have been working until dawn and sleeping through the afternoon, and now my body refuses to feel sleepy at any sensible hour"),
    ],
    "sleep_quality": [
        ("lex", "I keep waking up at night and feel exhausted in the morning"),
        ("para", "even after a full night in bed I drag myself through the day"),
        ("para", "I surface several times during the night and then struggle to doze again"),
        ("mix", "poori raat neend toot ti rehti hai aur subah bilkul fresh nahi lagta"),
        ("long", "I fall asleep quickly but I am up at two, then again at four, and by the time the alarm rings I am groggy and nodding off in the first lecture"),
    ],
    "worry": [
        ("lex", "I cannot stop overthinking small things"),
        ("para", "my mind keeps running through everything that might go wrong next week"),
        ("para", "one tiny worry turns into a whole chain of disasters in my head"),
        ("mix", "chhoti si baat ko lekar bhi mann mein hazaar tarah ke darr aa jaate hai"),
        ("long", "Even on quiet days I catch myself rehearsing arguments that never happen and picturing failures that have not occurred, and it leaves me drained by evening"),
    ],
    "panic_body": [
        ("lex", "sudden panic with a pounding heart and shaky hands"),
        ("para", "out of the blue my chest locks up and I feel I cannot breathe properly"),
        ("para", "my stomach twists into knots whenever stress builds up"),
        ("mix", "kabhi kabhi achanak dil bahut tez dhadakne lagta hai aur haath thande ho jaate hai"),
        ("long", "In the middle of the lab session my vision blurred, my heart hammered and my palms went damp, and I rushed out because I thought something was seriously wrong"),
    ],
    "social_anxiety": [
        ("lex", "I get very nervous when I have to talk in front of people"),
        ("para", "I rehearse a question in my head all lecture but never raise my hand"),
        ("para", "walking into the canteen where everyone sits in groups makes me want to turn back"),
        ("mix", "sabke saamne bolna padta hai toh gala sookh jaata hai aur awaaz kaanpti hai"),
        ("long", "I keep skipping the study group because I am convinced I will say something silly and they will judge me, so I stay home and feel even more cut off"),
    ],
    "low_motivation": [
        ("lex", "I feel numb and have lost interest in everything I used to like"),
        ("para", "I go through each day on autopilot without feeling much of anything"),
        ("para", "even small chores feel enormous and I see no reason to try"),
        ("mix", "kuch bhi karne ka mann nahi karta, din bas yun hi guzar jaata hai"),
        ("long", "My guitar sits untouched, I stopped replying to the group chat, and most days I just lie there scrolling because starting anything feels pointless"),
    ],
    "self_criticism": [
        ("lex", "I keep telling myself I am worthless and not good enough"),
        ("para", "scrolling through other people's achievements leaves me feeling like I am falling behind"),
        ("para", "my inner voice is harsher on me than anyone else could ever be"),
        ("mix", "mujhe lagta hai main sabse peeche reh gaya hu, mujhse kuch nahi hoga"),
        ("long", "Whenever I make a small mistake in class my mind replays it for days and I think about how everyone else is smarter and more capable than I will ever be"),
    ],
    "adjustment": [
        ("lex", "I am so homesick since I started at this new college"),
        ("para", "everything in this hostel feels foreign and I long for my old routine"),
        ("para", "months after moving I still feel unsettled and out of place"),
        ("mix", "hostel mein mann nahi lagta, ghar ki yaad aati rehti hai"),
        ("long", "I moved to a different city for my degree and while I wanted this, I now feel flat and teary in the evenings, thinking about my family dinners back home"),
    ],
    "new_environment": [
        ("lex", "how can I meet people on campus when I know nobody"),
        ("para", "I sit alone at lunch and wish somebody would just invite me over"),
        ("para", "all the groups were made in the first week and I feel like an outsider"),
        ("mix", "naya college hai aur koi dost nahi, kisi se baat kaise shuru karu"),
        ("long", "I joined late in the semester and everyone already has their circle, so I hover near the edges of conversations without knowing how to step in"),
    ],
    "left_out": [
        ("lex", "my friends went out without telling me and I feel left out"),
        ("para", "I found out about the party from photos and it really hurt"),
        ("para", "my closest friend and I had a bad argument and now we avoid each other"),
        ("mix", "dosto ne mujhe apne plan mein shaamil nahi kiya, bahut bura laga"),
        ("long", "Three of my friends planned a weekend away and only mentioned it afterwards, and since then I have been wondering whether I did something to push them away"),
    ],
    "isolation": [
        ("lex", "I have been keeping to myself and feel very lonely"),
        ("para", "days go by without me talking to anybody and the silence feels heavy"),
        ("para", "I decline every invitation but then regret being alone"),
        ("mix", "kisi se milne ka mann nahi karta par akele rehna bhi ab bhaari lagta hai"),
        ("long", "This month I have eaten alone in my room, ignored calls and stayed away from the common room, and I realise how disconnected I have become from everyone"),
    ],
    "procrastination": [
        ("lex", "I always postpone my work until the last minute"),
        ("para", "I tidy my desk and check messages instead of beginning the assignment"),
        ("para", "the deadline is close, I know it, and still I cannot make myself start"),
        ("mix", "assignment ko roz kal pe taal deta hu aur phir raat bhar jaagna padta hai"),
        ("long", "I promise myself every morning that I will write the essay, and then the day slips away on little distractions until I am panicking about the submission again"),
    ],
    "overload": [
        ("lex", "I have far too much on my plate and do not know where to start"),
        ("para", "I said yes to everything and now every day is a scramble"),
        ("para", "all my tasks feel equally urgent and I cannot decide what comes first"),
        ("mix", "club, assignments aur part time job, sab ek saath sambhalna mushkil ho gaya hai"),
        ("long", "Between the society event, two lab reports, tuition classes and family chores I am running on four hours of rest and I cannot see what could possibly be dropped"),
    ],
    "planning": [
        ("lex", "I want a better weekly study routine"),
        ("para", "I need a way to fit lectures, revision and free time into one sensible week"),
        ("para", "my days feel formless and I never know how to split my hours"),
        ("mix", "padhai ka ek achha routine banana hai jisme aaram ka time bhi ho"),
        ("long", "Some weeks I over-study and crash, other weeks I do nothing, so I would love a steady, realistic plan that leaves room for rest and for seeing friends"),
    ],
    "breathing": [
        ("lex", "show me a simple breathing technique to relax"),
        ("para", "what can I do with my breath to bring my heart rate down"),
        ("para", "I want something quick to unwind between classes without any equipment"),
        ("mix", "tension mein saans ko kaise control karu, koi easy tareeka batao"),
        ("long", "By mid-afternoon I am wound tight, so I am looking for a very short technique that uses breathing alone and that I can do quietly at my desk"),
    ],
    "body": [
        ("lex", "my neck and shoulders are so stiff from studying"),
        ("para", "my body feels clenched after a long day hunched over my laptop"),
        ("para", "I would like some slow movement to wind down before going to bed"),
        ("mix", "din bhar baithe rehne se body akad jaati hai, thoda stretching sikha do"),
        ("long", "After hours on my bed with a laptop my back aches and my jaw is tight, so I need a gentle routine that actually loosens everything up in the evening"),
    ],
    "mindfulness": [
        ("lex", "I would like to learn mindfulness and meditation"),
        ("para", "something to bring me back to the present when my thoughts are racing ahead"),
        ("para", "can a short walk be used as a way to pause and reset my mind"),
        ("mix", "mann ko shaant karne ke liye meditation kaise start karu"),
        ("long", "I spend most of the day planning and replaying things in my head, and I would like a gentle practice that teaches me to notice what is around me and in my body"),
    ],
    "distraction": [
        ("lex", "my phone keeps pulling me away while I am studying"),
        ("para", "every buzz breaks my concentration and I lose where I was"),
        ("para", "my desk is cluttered and I cannot settle into work there"),
        ("mix", "padhte waqt notifications baar baar dhyaan tod dete hai"),
        ("long", "I sit down to study with good intentions, then reels and chat messages creep in, and an hour later I have barely finished one page"),
    ],
    "attention": [
        ("lex", "I cannot concentrate when I read my notes"),
        ("para", "my eyes move across the lines but nothing stays in my head"),
        ("para", "I drift off in the middle of a sentence and have to start the paragraph again"),
        ("mix", "padhte padhte dhyaan idhar udhar chala jaata hai, kuch yaad nahi rehta"),
        ("long", "In lectures I realise ten minutes later that I was daydreaming, and when I revise I keep losing my place and rereading the same section over and over"),
    ],
    "study_method": [
        ("lex", "how do I use short focused study sessions with breaks"),
        ("para", "the hardest bit is sitting down to begin, after that it flows"),
        ("para", "I need a small trick to get past the reluctance of opening my books"),
        ("mix", "padhai shuru karne ka mann hi nahi hota, pehla kadam kaise uthaun"),
        ("long", "Once I get going I can work for hours, yet each day I lose a huge chunk of time putting off the first step, so I want a small ritual that gets me started"),
    ],
}

# 8 multi-concern queries: (text, [target subtopics])
MULTI = [
    ("I am worried about my exam and I lie awake thinking about it every night", ["exam_day", "sleep_onset"]),
    ("new to the city, feeling flat and I cannot get myself to do anything", ["adjustment", "low_motivation"]),
    ("I put off my project and my phone distracts me every time I sit down", ["procrastination", "distraction"]),
    ("I get nervous speaking in class and my body shakes afterwards", ["social_anxiety", "panic_body"]),
    ("too many commitments and I need to slow my breathing to cope", ["overload", "breathing"]),
    ("I keep isolating myself and I am so hard on myself about it", ["isolation", "self_criticism"]),
    ("tired from broken sleep and I cannot focus in lectures", ["sleep_quality", "attention"]),
    ("parents expect a lot and I freeze whenever the paper is handed out", ["exam_pressure", "exam_day"]),
]
