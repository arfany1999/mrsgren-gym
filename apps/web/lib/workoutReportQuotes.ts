// Motivational quotes shown on the post-workout report screen. Lives in
// /lib so the array can be tree-shaken from the main report bundle if a
// future iteration loads quotes lazily, and so contributors can edit
// copy without scrolling through component logic.

export interface MotivationalQuote {
  text: string;
  author: string;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  { text: "The pain you feel today is the strength you feel tomorrow.", author: "Arnold S." },
  { text: "No shortcuts. No excuses. Just results.", author: "Gym Code" },
  { text: "Every rep is a vote for the person you're becoming.", author: "Gym Code" },
  { text: "You didn't come this far to only come this far.", author: "Gym Code" },
  { text: "Iron never lies.", author: "Henry Rollins" },
  { text: "The only bad workout is the one that didn't happen.", author: "Gym Code" },
  { text: "Truth is, nobody cares how sore you are. Show up anyway.", author: "Gym Code" },
  { text: "The truth about fitness: there is no secret. Just lift.", author: "Gym Code" },
  { text: "Truth: the bar doesn't care about your excuses.", author: "Iron Gospel" },
  { text: "The truth is heavy. That's why so few people lift it.", author: "Gym Code" },
  { text: "Your body tells the truth your mouth never will.", author: "Gym Code" },
  { text: "Lifting is the answer. What was the question?", author: "Gym Code" },
  { text: "Lift heavy. Eat. Sleep. Repeat. That's literally it.", author: "Gym Code" },
  { text: "Lifting won't solve all your problems. But it's a solid start.", author: "Gym Code" },
  { text: "The weight never lies. Your log book never forgets.", author: "Gym Code" },
  { text: "A bad day lifting still beats a good day on the couch.", author: "Gym Code" },
  { text: "Whether you think you can or you can't — pick up the bar anyway.", author: "Gym Code" },
  { text: "You can complain about being weak, or you can fix it. Not both.", author: "Gym Code" },
  { text: "You can start over. The gym doesn't hold grudges.", author: "Gym Code" },
  { text: "You cannot buy discipline. You earn it one session at a time.", author: "Gym Code" },
  { text: "You can do anything for one more rep.", author: "Gym Code" },
  { text: "I'm not sweating. I'm leaking gains.", author: "Gym Lore" },
  { text: "Leg day: feared by many, skipped by most.", author: "Gym Lore" },
  { text: "Rest day? My body auto-corrected that to 'chest day'.", author: "Gym Lore" },
  { text: "Abs are made in the kitchen. Mine are still on delivery.", author: "Gym Lore" },
  { text: "I came. I saw. I did one more set.", author: "Julius Reps-ar" },
  { text: "Discipline is remembering what you want most over what you want now.", author: "Gym Code" },
  { text: "Consistency is the most underrated superpower.", author: "Gym Code" },
  { text: "The mirror shows who you were. The bar decides who you'll be.", author: "Gym Code" },
  { text: "Champions aren't made in gyms. They're revealed there.", author: "Gym Code" },
  { text: "The mind gives up long before the body does. Train both.", author: "Gym Code" },
  { text: "Momentum is built, not born. Start. Now.", author: "Gym Code" },
  { text: "Progress is quiet. Consistency is loud.", author: "Gym Code" },
  { text: "Strength is not given. It's extracted rep by rep.", author: "Gym Code" },
  { text: "One day you'll wish you'd started sooner. Today is still sooner.", author: "Gym Code" },
  { text: "Your future self is watching through the weights you chose today.", author: "Gym Code" },
];
