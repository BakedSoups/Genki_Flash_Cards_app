# Kotoba Cards

A lightweight Japanese flashcard web app powered by Python.

## Features

- Study Hiragana → English, Hiragana → Romaji, English → Romaji, or English → Hiragana.
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

## Study history

Progress is stored in the Git-ignored `history.json`. The app creates it after
your first session. For sample data, run:

```bash
cp history.example.json history.json
```

Older history remains compatible. All guesses in an older word record are
treated as right, with zero wrong guesses, until new results are recorded.
