# Kotoba Cards

A lightweight Japanese flashcard web app powered by Python.

## Features

- Practice **Lesson 7 Sentences** with token scores, colored Japanese feedback,
  English explanations, progressive hints, and immediate retries with hints enabled.
- Study **Lesson 8-1** vocabulary or its **Lesson 8-1 Katakana** subset.
  Katakana words reveal their katakana spelling after checking an answer.
- Study **Lesson 8-2** for 28 more vocabulary entries, with romaji, English,
  and hiragana readings.
- Study Hiragana → English, Hiragana → Romaji, English → Romaji, or English → Hiragana.
- Select **Learn Katakana** for the 46 basic katakana characters, answered in romaji.
- Select **Learn Kanji** for a separate lesson of 14 single kanji characters.
  Guess any listed reading in romaji using one answer field.
- Select **Lesson 5 Kanji** for 14 kanji, from 山 (mountain) to 飲 (to drink).
  It defaults to separate reading boxes, like Lesson 4. Enter `ta` and `da`
  in separate boxes for 田, in either order.
- Choose **Kanji → Romaji (one reading)** to guess one listed reading of a kanji
  or the full reading of a kanji word. Select Lesson 4 or Lesson 4-2 to try it.
- Practice kanji-to-romaji readings in any order with up to three separate
  answer fields.
- Practice kanji meanings in English; cards with multiple listed meanings
  accept any one of them.
- Choose removal, fixed-loop, or introduction mode.
- Practice every word or focus on your most-missed words.
- Set 1–5 loops, shuffle cards, and enable progressive hints.
- Review each word's right/wrong ratio, accuracy, and recent runs in study history.

Press `Enter` to check an answer or continue. Press `Ctrl+H` for a hint when
hints are enabled. In kanji practice, use the arrow keys to move between
reading fields. With hints enabled, press `Enter` after an incorrect kanji
answer to retry the same card immediately. With hints off, it returns later.

## Screenshots

| Practice and feedback | Study history |
| --- | --- |
| ![Correct answer feedback](docs/images/study-correct.png) | ![Study history and most-missed words](docs/images/study-history.png) |

![Incorrect answer feedback](docs/images/study-feedback.png)

## Run

```bash
python app.py
```

Open <http://127.0.0.1:8001>.

## Add lessons

Create files such as `lesson8.csv` beside `app.py` using this format:

```csv
inu,dog,いぬ
neko,cat,ねこ
```

Lessons appear automatically after a refresh.

Kanji-reading lessons use `kanji` in the fourth CSV column. Separate multiple
hiragana readings with `|`:

```csv
日,day / sun,に|にち|び,kanji
本,book / origin,ほん,kanji
```

The `kanji` marker makes the card show the kanji and ask for all readings in romaji.
Regular three-column lessons continue to use romaji, English, and hiragana as
shown above.

Compound-kanji lessons use the `kanji-word` marker and ask for one complete
word reading. They support kanji-to-romaji, kanji-to-hiragana, and
English-to-romaji practice. English-to-romaji feedback also reveals the full
kanji spelling below the reading:

```csv
日本,Japan,にほん,kanji-word
日曜日,Sunday,にちようび,kanji-word
```

## Study history

Progress is stored in the Git-ignored `history.json`. The app creates it after
your first session. For sample data, run:

```bash
cp history.example.json history.json
```

Older history remains compatible. All guesses in an older word record are
treated as right, with zero wrong guesses, until new results are recorded.
