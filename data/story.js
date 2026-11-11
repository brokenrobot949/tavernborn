// The Dragon's Due: eight chapter cards, one per dungeon (keyed by region id).
// The first clear of a dungeon recovers a page of the original lease and shows its card.
//   title    card heading
//   page     what was recovered
//   learned  one line for the Chronicle and the Map tab
//   text     the card itself, a few short paragraphs
export const STORY_TITLE = "The Dragon's Due";

export const CHAPTERS = {
  mugwick: {
    n: 1, title: 'Served From Below', page: 'Page one of the lease',
    learned: 'The notice is genuine. The goblins downstairs were serving it.',
    text: [
      'The eviction notice on the door of The Wobbly Griffin is not a prank and not a mistake. It was drawn up in the tavern\'s own second cellar by Under-Sheriff Skrindle, who has an office there, and has had for some time.',
      'Skrindle acts for the dragon Vexaldrith, who owns the realm and says the rent is three hundred years overdue.',
      'Among his papers is one page of a much older document. It begins: "This lease, between the Landlord and the peoples of the Vale, the Wood, the Coast, and the Mountain." The other pages have been removed. The barkeep has pinned this one above the bar and poured the hero something on the house.',
    ],
  },
  mumblewood: {
    n: 2, title: 'What the Wood Was Saying', page: 'Page two of the lease',
    learned: 'The forest has been repossessed, which is why it mumbles.',
    text: [
      'The Mumblewood does not talk in its sleep for no reason. Every tree in it was seized against the debt, tagged, and entered in a schedule, and the trees have been reciting that schedule ever since because nobody would listen.',
      'Old Bramblewick held the papers. He did not want the job and is glad to be rid of the page.',
      'Page two sets the rent: a fixed sum, due each quarter day, "to be carried to the Landlord by the Coast road". So the money went by sea. The wood is a little quieter tonight.',
    ],
  },
  saltmarrow: {
    n: 3, title: 'Not the Dragon', page: 'Page three of the lease',
    learned: 'The smugglers have been paying someone. It was not the dragon.',
    text: [
      'For forty years every smuggler on the Saltmarrow Coast has paid a fee to the Drowned Lighthouse. They believed it was the dragon\'s cut. The Tide-Reeve let them believe it.',
      'Her receipt book says otherwise. The fees went out on the tide to a mark, a small drawn lamp with a line through it. No coin of it went up the mountain.',
      'Page three names who was to carry the rent: "the Under-King\'s bearers, by the mountain pass". Somebody has been collecting in the dragon\'s name. The hero writes the mark on the inside of a glove.',
    ],
  },
  peaks: {
    n: 4, title: 'The Only Copy', page: 'Page four of the lease',
    learned: 'The dwarves signed the lease. The Under-King kept the only copy and then mislaid himself.',
    text: [
      'The dwarves of the Grumbling Peaks witnessed the lease and their king took charge of it. There was one copy. He carried it into his hall, sealed the door for safekeeping, and was never seen to come out.',
      'His Seneschal has stood guard for two hundred years over a hall with nobody in it. The page was in its chest. The King himself is not here, and neither are the other pages.',
      'Page four is the list of witnesses, and one line below them in a different hand: "Accounts to be kept by the brothers of the Fen." If the rent was paid, the monks will have written it down.',
    ],
  },
  gloamfen: {
    n: 5, title: 'Paid', page: 'Page five of the lease',
    learned: 'The monks kept the ledgers. The ledgers say the rent was paid.',
    text: [
      'The brothers of the Sunken Abbey rang the bells each quarter day when the rent passed through, and entered it in a ledger. They did this for three hundred years. They are still doing it, though the abbey is under the mere and the brothers are dead.',
      'Every entry says the same thing. Paid.',
      'So the realm is not in arrears, and the dragon has still not been paid. Abbot Dolorous will say only that one man disputed the books in his time, a king from the desert, and that he was called to give evidence and did not arrive.',
    ],
  },
  cinder: {
    n: 6, title: 'The Witness', page: 'Page six of the lease',
    learned: 'A king was buried three times to stop him testifying.',
    text: [
      'The Thrice-Buried King is in fair spirits for a man in his position. He saw the rent change hands at the edge of his kingdom, three hundred years ago, and saw that the hands were the wrong ones.',
      'He said so. Shortly afterwards he was buried. When he was heard knocking, he was buried again, deeper, and then a third time with a warden.',
      'His testimony takes most of a night. The short version is this: the rent was met on the road by a buyer who paid the bearers a little, kept the rest, and sent nothing on. The King never saw a face. The buyer always dealt from below ground.',
    ],
  },
  underdeep: {
    n: 7, title: 'At a Markup', page: 'Page seven of the lease',
    learned: 'The payments were sold on, at a markup, by a broker nobody has seen.',
    text: [
      'In the Lightless Market a debt can be bought, sold, and sold again without anyone seeing who holds it. For three hundred years one stall has bought the realm\'s rent each quarter, and sold the dragon\'s claim for it back to her collectors at a markup.',
      'The realm paid. The dragon was told it had not. The difference went to the stall with no lamp.',
      'The Broker was not there. Only the Voice was, and the book of sales, which is in the hero\'s pack with page seven. That makes seven pages, the ledgers, and a witness. There is one page left, and it is in the Hoard.',
    ],
  },
  wyrmspire: {
    n: 8, title: 'Settled', page: 'The last page, and the deed',
    learned: 'The hero presents the full lease. Vexaldrith disputes it in the traditional manner.',
    text: [
      'The hero presented the lease, the ledgers, and the book of sales at the top of Wyrmspire. Vexaldrith disputed them in the traditional manner, at length, and lost.',
      'She was defeated the way heroes are: knocked out, not slain. When she woke she read every page, twice, and then the book of sales. She said nothing for some time. Then she said that somebody in the Underdeep was going to have a very bad century.',
      'She conceded the point with poor grace and signed the last page with one claw. The eviction is withdrawn. The deed to The Wobbly Griffin hangs on the wall behind the bar, slightly scorched, and the barkeep has not stopped polishing the frame.',
    ],
  },
};
