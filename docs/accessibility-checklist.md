# Screen-reader and keyboard release check

Automated checks do not replace assistive-technology testing. Before release, test with VoiceOver + Safari on macOS and NVDA + Firefox on Windows.

1. Navigate from the skip link through the header, exam choice, navigation, filters, practice cards, and footer using only Tab, Shift+Tab, Enter, Space, and Escape.
2. Confirm each page and dialog has a useful announced heading or accessible name.
3. In a practice session, confirm tabs, timer state, recording state, rating controls, errors, and saved status are announced.
4. Confirm focus stays inside an open dialog and returns to its trigger after closing.
5. Test Arabic reading order and French prompt pronunciation.
6. At 200% zoom and 320 CSS pixels wide, confirm there is no two-dimensional scrolling.
7. Record the browser, screen-reader version, tester, date, and issues in release notes.
