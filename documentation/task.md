Дивись друже, яка у мене є проблема. Є проект, який використовує цю біббліотеку. І от є у мене там така от задача.

Є у мене якийсь інтерфейс AgentHookHandler, який щось там вміє, неважливо що саме. Але інстансів такого інтерфейсу в системі може буде декілька. І от є у мене серрвіс, який з цими інстансами працює:

export class AgentService {
	@injectAll(AGENT_HOOKS_HANDLER, ResolveScope.Children | ResolveScope.Current) private
}

Ну, тобто, щоб це працювало, я маю створити для кожного інстансу дочерний контейнер та зарегати в ньому інстанс, що реалізує цей інтеррфейс під однаковвим айдишником AGENT_HOOKS_HANDLER. При чому зверни увагу, що в моєму прикладі цей інтерйес шукаєтсья також в поточному контейнері, що вимагає обережно обрати тільки один інстанс, а інші пхати у дочірні контейнери.

Більше того, от наприклад якщо такий інстанс потрібен не тільки як генерік-реалізація інтерйесу, а ще і  як він самий, то мені доводиться проходити складн8у процедуру реєстрації під 2-ма айдішніками, що м'ягко кажучи руйнує базову ідею бібліотеки - просте використання DI-контейнерів

От приклад такого сервісу:

@injectable()
export class ConversationHistoryTrackerService implements AgentHookHandler {
   // ...
}

От  танці з бубном для реєстрації дочірнього контейнера створення інтсантсу і йогореєстрації рід двома депенденси айди:

{
	const historyTrackerContainer = childContainer.createChildContainer();
    const historyTracker = new ConversationHistoryTrackerService();
    historyTrackerContainer.register(historyTracker, AGENT_HOOKS_HANDLER);
    historyTrackerContainer.register(historyTracker, ConversationHistoryTrackerService);
}

А от танці з бубном, щоб цей інстанс дістати і звертитись до нього як до єдиного інстансу

export class UserRequestService {
  @injectAll(ConversationHistoryTrackerService, ResolveScope.Children) private historyTrackers!: ConversationHistoryTrackerService[];

  private get historyTracker(): ConversationHistoryTrackerService {
    return this.historyTrackers[0];
  }
}

Короче пиздець. Я бачу 2 шляхи розв'язанні цієї проблеми:

Загальна риса - в @injectable() декоратор передавати масив айдишников, по яким, помимо самого імені класа його можна заінджектити. Тобто ми реєструємо 1 клас/інстанс, а він автоматом реєструється від кількома айдишниками, і не залежного від того під яким було зінджексшено депенденси, вони отримають той самий інстанс.


Варіант 1-й.
-----------------------------
 

1. Ми помічаємо наші класи, що реалізуються загальний інтерфейс айшниками, може і не одним, під яким воно має шукатись:

@injectable([AGENT_HOOKS_HANDLER])
export class ConversationHistoryTrackerService implements AgentHookHandler {
   // ...
}

2. Ми по-прежнему створюємо дочерний контейнер для цієї залежності, але вже реєструємо лише один інстанс
{
	const historyTrackerContainer = childContainer.createChildContainer();
    historyTrackerContainer.register(ConversationHistoryTrackerService);
}

3. Ми додаємо в інжекс скоуп, як і інжест алл. За Замовченням воно як і раніше шукає залежність в цьому контейнері і в родителі, але скойпом можна його заставити шукати в дітях. 

export class UserRequestService {
  @inject(ConversationHistoryTrackerService, ResolveScope.Children) private historyTracker!: ConversationHistoryTrackerService;
}


-----------------------------


1. Ми помічаємо наші класи, що реалізуються загальний інтерфейс айшниками, може і не одним, під яким воно має шукатись:

@injectable([AGENT_HOOKS_HANDLER])
export class ConversationHistoryTrackerService implements AgentHookHandler {
   // ...
}

2. Ди модаємо залежність в той же конейнер
{
	childContainer.register(ConversationHistoryTrackerService);
}

3. Ми достаємо її як зазвичай. 
export class UserRequestService {
  @inject(ConversationHistoryTrackerService) private historyTracker!: ConversationHistoryTrackerService;
}


---

В обох варіантах тепер виникає можливість для одного айдишника в одному контейнері мати кілька інстансів і виходить, що @inject має отримувати тільки першу залежність, і інші ігнорити. Ну, мож якесь попередження в консоль писати.


Що скажеш? Мені  більш подобається 2-й варіант, бо все одно треба хендлить кілька інстансів на один айдишник, але 2-й варіант виглядає чистішим.  Або можна їх сумістити, бо скоуп в обох інджектах виглядає консистентно. Ну і виникають інші питання, типу треба аккуратно видаляти інстанси, щоб не залишались висяки і подивитись як база тестів на це відреагує мож там ще якість проблеми виникнуть. 