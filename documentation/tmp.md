Injects arrays of dependencies from container hierarchy.

Тут треба сказати, що це  шлях через який проксиди працює з колекціями - під кожний інстанс з колекції робиться свій дочерний контейнер де у ньогоє можливість вистроїти свої залежності.

esolves all matching instances across parent/current/children containers.

тут треба зазаначити що це поведінка за замовчуванням, і можна шукати окремо в будь-який комбінації

Parent (0b001) - parent container only

от цфя бінарна хуета тут зайва, а от імені сраного енуму не вистачає

@injectAll creates permanent Proxy (via makeInjectAllProxy.ts) that dynamically resolves dependencies on each access. Array updates automatically when containers added/removed in hierarchy.

тут здається протиріччя? воно збирає масив при кожному зверненні чи оновлює його автоматично?

Common patterns:
бляха чувак, а нахуй ти почав воду лить? ну нахуй воно тут?


Why isKnown() vs hasOwn() in resolveAll?
resolveAll.ts:65 uses parent.isKnown() (not hasOwn()) — searches up parent hierarchy, not just immediate parent.

resolveAll.ts:57 uses hasOwn() for Current scope — exact container match only.

Reason: Parent scope means "anything parent can resolve", not "only what parent owns directly".

чувак, я думаю от це можна просто в коментаж-х до коду написати. І взагалі прибери ці посилання на конкретні строки коду, якщо є що сказати, краще перенести в коментарі



І взазалі, може варто якусь мармилад діаграмку всунути, щоб показати, як воно може знаходити залежності з графу, і показати, що не здатно у паралельних гілках графу щось знайти

