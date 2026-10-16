/*
 * core/i18n.ts - every piece of text the UI shows, in French and English.
 * `Strings` is the contract: both dictionaries implement it in full, so a
 * missing translation is a compile error rather than a blank label.
 */
import type { AppLanguage, CalendarState, ConfigFileErrorCode, RecurrenceFrequency } from 'budget-lib';

export interface Strings {
  appName: string;
  nav: { transactions: string };
  common: {
    cancel: string; delete: string; save: string; add: string;
    expense: string; income: string; all: string; back: string;
    noDescription: string; ok: string; close: string;
  };
  snackbar: {
    movedToTrash: string; undo: string; seriesDeleted: string; restored: string; deletedForever: string; trashEmptied: string;
    added: string; updated: string; synced: string; backupExported: string; backupImported: string; configExported: string;
    thresholdsSaved: string;
  };
  lock: {
    title: string; help: string; enable: string; newPin: string; confirmPin: string; currentPin: string; pinInvalid: string;
    pinMismatch: string; wrongPin: string; unlock: string; biometric: string; biometricUnlock: string; biometricFailed: string;
    change: string; disable: string; disableConfirm: string; lockNow: string; saved: string; disabled: string; blocked(seconds: number): string;
  };
  selection: {
    select: string; cancel: string; selectAll: string; none: string; count(n: number): string; delete: string; category: string;
    restore: string; deleteForever: string; chooseCategory: string; deleted(n: number): string; recategorised(n: number): string;
    restored(n: number): string; deletedForever(n: number): string; deleteForeverBody(n: number): string;
  };
  frequency: { daily: string; weekly: string; monthly: string; bimonthly: string; quarterly: string; semiannual: string; yearly: string };
  trash: {
    title: string; empty: string; help: string; restore: string; deleteForever: string; emptyAction: string;
    emptyBody(count: number): string; deleteForeverBody(details: string): string; deletedOn(date: string): string;
    categories: string; categoryForeverBody(name: string): string;
  };
  months: string[];
  budget: {
    balance: string; income: string; expenses: string;
    searchPlaceholder: string; emptyTitle: string; emptyText: string;
    noMatch: string; recurringBadge: string;
    emptyRecurring: string; emptyOneOff: string; currentMonth: string;
    oneOff: string; recurring: string;
    deleteTitle: string; deleteBody(details: string): string;
    deleteScopeBody: string; thisOccurrence: string; wholeSeries: string;
    categoryFilter: string; resetFilters: string; filters: string;
    previousMonth: string; nextMonth: string; previousYear: string; nextYear: string;
  };
  levels: { critical: string; low: string; medium: string; high: string };
  editor: {
    newTitle: string; newRecurringTitle: string; editTitle: string; amount: string; date: string; description: string;
    category: string; repeat: string; frequency: string; limited: string;
    occurrences: string; invalidAmount: string; invalidDate: string; scopeTitle: string;
    customFrequency: string; interval: string; invalidInterval: string; unit: string;
    units: Record<RecurrenceFrequency, string>;
    ended: string; until: string; invalidUntil: string;
    installments: string; installmentsHelp: string; addInstallment: string; removeInstallment: string; invalidInstallment: string;
    partial: string; activeMonths: string; partialHelp: string; invalidActiveMonths: string;
    scopeBody: string; occurrenceOnly: string; seriesToo: string;
  };
  stats: {
    title: string; expensesByCategory: string; fromMonth: string; toMonth: string; recurringExpensesByCategory: string; history: string;
    noData: string;
  };
  settings: {
    title: string; general: string; language: string; currency: string; dateFormat: string;
    amountFormat: string; theme: string; themeSystem: string; themeLight: string;
    themeDark: string; formatLocale: string; thresholds: string; thresholdsHelp: string;
    low: string; medium: string; high: string; thresholdsOrder: string; thresholdsSaved: string;
    manage: string; chooseOption: string;
    tabs: { general: string; budget: string; calendar: string; data: string };
  };
  calendar: {
    title: string; help: string; enable: string; url: string; username: string; password: string;
    passwordKept: string; passwordSession: string; passwordStored: string; proxy: string; proxyHelp: string; save: string; check: string; syncNow: string;
    syncInterval: string; syncIntervalHelp: string;
    states: Record<CalendarState, string>; never: string; lastSync(date: string): string;
    invalidConfig: string; passwordRequired: string; connected: string; connectedDisabled: string; authError: string;
    networkError: string; serverError(message: string): string; conflicts(count: number): string;
  };
  categories: {
    title: string; newName: string; exists(name: string): string;
    mustKeepOne: string; deleteBody(name: string): string; rename: string; pickIcon: string;
  };
  backup: {
    title: string; help: string; export: string; import: string; confirm: string; invalid: string;
    corrupted: string;
  };
  config: {
    help: string; export: string; import: string; passphrase: string; passphraseConfirm: string;
    passphraseHelp: string; passphraseMismatch: string; imported: string; importedCalendar: string;
    importedCalendarPassword: string; importedNoCalendar: string; bankIgnored: string;
    errors: Record<ConfigFileErrorCode, string>; unreadable: string;
  };
  install: { title: string; body: string; install: string; dismiss: string; settingsHelp: string };
  update: { title: string; body: string; apply: string; later: string };
  onboarding: {
    label: string; skip: string; next: string; start: string; replayTitle: string; replayHelp: string; replay: string;
    slides: { title: string; body: string }[];
  };
  schedule: {
    title: string; empty: string; horizon: string; months(count: number): string; deleteBody(name: string): string;
    income: string; expense: string;     net: string; total: string;
  };
  profiles: {
    title: string; defaultName: string; active: string; use: string; add: string; addPlaceholder: string;
    namePlaceholder: string; deleteBody(name: string): string; switchBody(name: string): string; help: string;
    current: string; settingsEntry: string;
  };
  about: { title: string; intro: string; version: string; license: string; libraries: string; assets: string };
}

const en: Strings = {
  appName: 'Budget',
  nav: { transactions: 'Transactions' },
  common: {
    cancel: 'Cancel', delete: 'Delete', save: 'Save', add: 'Add',
    expense: 'Expense', income: 'Income', all: 'All', back: 'Back',
    noDescription: '(no description)', ok: 'OK', close: 'Close',
  },
  snackbar: {
    movedToTrash: 'Moved to the trash', undo: 'Undo', seriesDeleted: 'Series deleted', restored: 'Transaction restored',
    deletedForever: 'Permanently deleted', trashEmptied: 'Trash emptied', added: 'Transaction added', updated: 'Transaction updated',
    synced: 'Calendar synchronised', backupExported: 'Backup exported', backupImported: 'Backup imported',
    configExported: 'Settings exported', thresholdsSaved: 'Thresholds saved',
  },
  lock: {
    title: 'App lock', help: 'Asks for a PIN when the app opens or comes back after a while. It hides the screen; the data stays stored unencrypted on this device.',
    enable: 'Set a PIN', newPin: 'New PIN (4 to 8 digits)', confirmPin: 'Confirm the PIN', currentPin: 'Current PIN', pinInvalid: 'The PIN must have 4 to 8 digits.',
    pinMismatch: 'The PINs do not match.', wrongPin: 'Wrong PIN.', unlock: 'Unlock', biometric: 'Unlock with the device (fingerprint, face…)',
    biometricUnlock: 'Use the device unlock', biometricFailed: 'Device unlock failed or was cancelled.', change: 'Change the PIN', disable: 'Remove the lock',
        disableConfirm: 'The app will open without asking for a PIN.', lockNow: 'Lock now', saved: 'Lock saved', disabled: 'Lock removed', blocked: (seconds) => `Too many attempts. Try again in ${seconds} s.`,
  },
  selection: {
    select: 'Select', cancel: 'Cancel', selectAll: 'Select all', none: 'Select transactions', count: (n) => `${n} selected`, delete: 'Delete',
    category: 'Category', restore: 'Restore', deleteForever: 'Delete forever', chooseCategory: 'Choose a category',
    deleted: (n) => `${n} moved to the trash`, recategorised: (n) => `${n} updated`, restored: (n) => `${n} restored`,
    deletedForever: (n) => `${n} permanently deleted`, deleteForeverBody: (n) => `Permanently delete ${n} transaction(s)? This cannot be undone.`,
  },
  frequency: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', bimonthly: 'Every 2 months', quarterly: 'Quarterly', semiannual: 'Every 6 months', yearly: 'Yearly' },
  trash: {
    title: 'Trash', empty: 'The trash is empty.',
    help: 'Deleted transactions stay here, and in the calendar, until you restore them or empty the trash.',
    restore: 'Restore', deleteForever: 'Delete permanently', emptyAction: 'Empty the trash',
    emptyBody: (count) => `${count} item(s) will be permanently deleted, calendar events included.`,
    categories: 'Categories', categoryForeverBody: (name) => `The category "${name}" will be permanently deleted.`,
    deleteForeverBody: (details) => `${details} will be permanently deleted, calendar event included.`,
    deletedOn: (date) => `Deleted on ${date}`,
  },
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'],
  budget: {
    balance: 'Balance', income: 'Income', expenses: 'Expenses',
    searchPlaceholder: 'Search...', emptyTitle: 'No transactions',
    emptyText: 'Tap + to add your first transaction of the month.',
    noMatch: 'No transaction matches these filters.', recurringBadge: 'recurring',
    currentMonth: 'Current month',
    emptyRecurring: 'No recurring transactions this month.', emptyOneOff: 'No one-off transactions this month.',
    oneOff: 'One-off', recurring: 'Recurring',
    deleteTitle: 'Delete transaction?',
    deleteBody: (details) => `${details} will be moved to the trash.`,
    deleteScopeBody: 'This transaction belongs to a recurring series.',
    thisOccurrence: 'This occurrence only', wholeSeries: 'Delete the whole series',
    categoryFilter: 'Category', resetFilters: 'Reset', filters: 'Filters',
    previousMonth: 'Previous month', nextMonth: 'Next month', previousYear: 'Previous year', nextYear: 'Next year',
  },
  levels: { critical: 'Critical', low: 'Low', medium: 'Medium', high: 'Comfortable' },
  editor: {
    newTitle: 'New transaction', newRecurringTitle: 'New recurring transaction', editTitle: 'Edit transaction', amount: 'Amount', date: 'Date',
    description: 'Description', category: 'Category', repeat: 'Repeat',
    frequency: 'Frequency', limited: 'Limit the number of occurrences',
    occurrences: 'Occurrences', invalidAmount: 'Enter an amount greater than zero.', invalidDate: 'Enter a valid date.',
    customFrequency: 'Custom', interval: 'Repeat every', invalidInterval: 'Enter a number between 1 and 60.',
    unit: 'Unit', units: { daily: 'Days', weekly: 'Weeks', monthly: 'Months', bimonthly: 'Two-month periods', quarterly: 'Quarters', semiannual: 'Half-years', yearly: 'Years' },
    installments: 'Other dates', installmentsHelp: 'Extra dates of each period of the series, each with its own amount.', addInstallment: 'Add a date', removeInstallment: 'Remove this date', invalidInstallment: 'Each extra date needs a positive amount and must fall within the same period as the main date, not before it.',
    ended: 'End on a given month', until: 'Last month', invalidUntil: 'The last month cannot be before the first one.',
    partial: 'Spread over part of the year', activeMonths: 'Months per year',
    partialHelp: 'Due every month from the first date for this many months, then paused until the same month next year.',
    invalidActiveMonths: 'Enter a number between 1 and 11.',
    scopeTitle: 'Apply the change to',
    scopeBody: 'This transaction is part of a recurring series.',
    occurrenceOnly: 'This occurrence only', seriesToo: 'The whole series',
  },
  stats: {
    title: 'Statistics', expensesByCategory: 'Other expenses by category',
    fromMonth: 'From', toMonth: 'To',
    recurringExpensesByCategory: 'Recurring expenses by category',
    history: 'History', noData: 'Nothing to show yet.',
  },
  settings: {
    title: 'Settings', general: 'General', language: 'Language', currency: 'Currency',
    dateFormat: 'Date format', amountFormat: 'Amount format', theme: 'Theme',
    themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark', formatLocale: 'Language default',
    thresholds: 'Balance thresholds',
    thresholdsHelp: 'Below Low: critical. Low to Medium: low. Medium to High: medium. Above High: comfortable.',
    low: 'Low (x)', medium: 'Medium (y)', high: 'High (z)',
    thresholdsOrder: 'Thresholds must satisfy x < y < z.', thresholdsSaved: 'Thresholds saved',
    manage: 'Manage',
    chooseOption: 'Choose',
    tabs: { general: 'General', budget: 'Budget', calendar: 'Calendar', data: 'Data' },
  },
  calendar: {
    title: 'Calendar synchronisation',
    help: 'Transactions are stored as all-day events in this CalDAV calendar, shared between desktop, mobile and web. Recurrence templates stay on this device.',
    enable: 'Enable synchronisation', url: 'Calendar URL', username: 'Username', password: 'Password / app password',
    passwordKept: 'Leave empty to keep the saved password',
    passwordSession: 'This browser cannot keep secrets: the password stays in memory for this session only. Enter it again after reloading the app.',
    passwordStored: 'The password is stored encrypted on this device only; it is never shown again and never leaves the device except to reach the calendar server.',
    proxy: 'CORS proxy (optional)',
    proxyHelp: 'Address of a budget-caldav-proxy deployment, needed when the calendar server does not allow web apps (most hosted providers). Leave empty for direct access.',
    save: 'Save settings', check: 'Test connection', syncNow: 'Synchronise now',
    syncInterval: 'Automatic synchronisation (minutes)', syncIntervalHelp: 'Synchronise every N minutes while the app is open. 0 turns it off.',
    states: { disabled: 'Synchronisation off', syncing: 'Synchronising...', online: 'Connected', offline: 'Offline', error: 'Error' },
    never: 'never', lastSync: (date) => 'Last synchronisation: ' + date,
    invalidConfig: 'Enter an HTTP(S) calendar URL and a username.',
    passwordRequired: 'Enter the calendar password for this session in Settings.',
    connected: 'Connection successful.',
    connectedDisabled: 'Connection successful. Turn on "Enable synchronisation" to start exchanging transactions.',
    authError: 'Authentication failed. Check the username and password.',
    networkError: 'Calendar unreachable. Changes stay on this device. Check your connection and the server CORS settings.',
    serverError: (message) => 'Calendar error: ' + message,
    conflicts: (count) => count + ' conflict(s) skipped. Synchronise again to retry.',
  },
  categories: {
    title: 'Categories', newName: 'New category',
    exists: (name) => `The category "${name}" already exists.`,
    mustKeepOne: 'At least one category must remain.',
    deleteBody: (name) => `Delete "${name}"? It moves to the trash; existing transactions keep it, only the list offered for new ones changes.`,
    rename: 'Rename', pickIcon: 'Change the icon',
  },
  backup: {
    title: 'Backup', help: 'Export the budget to a file, or restore it from a previous export.',
    export: 'Export a backup', import: 'Import a backup',
    confirm: 'Replace all the data of this device with this backup?',
    invalid: 'This file is not a recognised Budget backup.',
    corrupted: 'The saved budget could not be read and was set aside. The app starts empty; restore a backup if you have one.',
  },
  config: {
    help: 'Settings, thresholds and calendar access (including its password) can be moved to another device in a file encrypted with a passphrase. Nothing can be recovered without it.',
    export: 'Export the configuration', import: 'Import a configuration',
    passphrase: 'Passphrase', passphraseConfirm: 'Confirm the passphrase',
    passphraseHelp: 'At least 8 characters. Keep it safe: it cannot be recovered.',
    passphraseMismatch: 'The two passphrases differ.',
    imported: 'Configuration imported.', importedCalendar: 'Calendar access applied.',
    importedCalendarPassword: 'Calendar password applied.',
    importedNoCalendar: 'No calendar access in this file.',
    bankIgnored: 'The bank configuration of the file was ignored: this app has no bank import.',
    errors: {
      format: 'This file is not a Budget configuration, or comes from a newer version.',
      passphrase: 'Wrong passphrase, or damaged file.',
      content: 'The content of this file is not a valid configuration.',
      'weak-passphrase': 'The passphrase must have at least 8 characters.',
    },
    unreadable: 'The file could not be read.',
  },
  install: {
    title: 'Install Budget', body: 'Add the app to your home screen to use it full screen and offline.',
    install: 'Install', dismiss: 'No thanks',
    settingsHelp: 'Install the app on this device to use it full screen and offline.',
  },
  update: {
    title: 'Update available', body: 'A new version of Budget is ready.',
    apply: 'Update', later: 'Later',
  },
  onboarding: {
    label: 'Welcome tour', skip: 'Skip', next: 'Next', start: 'Get started',
    replayTitle: 'Introduction', replayHelp: 'Replay the presentation of the app.', replay: 'Show the tour',
    slides: [
      { title: 'Welcome to Budget', body: 'Track your income and expenses month by month, simply and privately.' },
      { title: 'Add transactions', body: 'Tap the plus button to record an expense or an income, with its date, amount and category.' },
      { title: 'Recurring transactions', body: 'Turn on "Repeat" for rent, salary or subscriptions: they come back automatically every month, quarter or year.' },
      { title: 'Stats and history', body: 'See where your money goes by category and follow your balance over the months.' },
      { title: 'Sync with your calendar', body: 'Connect an online calendar in Settings to keep your transactions on all your devices.' },
    ],
  },
  schedule: {
    title: 'Schedule', empty: 'No upcoming occurrence. Recurring transactions you create appear here.',
    horizon: 'Period', months: (count) => count === 1 ? '1 month' : `${count} months`,
    deleteBody: (name) => `Delete the recurring transaction "${name}" and all its future dates?`,
    income: 'Income', expense: 'Expenses', net: 'Balance', total: 'Total',
  },
  profiles: {
    title: 'Profiles', defaultName: 'Main', active: 'Active', use: 'Use', add: 'Add', addPlaceholder: 'New profile name',
    namePlaceholder: 'Profile name', deleteBody: (name) => `Delete the profile "${name}" and all of its data? This cannot be undone.`,
    switchBody: (name) => `Switch to "${name}"? The app reloads.`,
    help: 'Each profile has its own transactions, categories, recurring transactions, settings and calendar sync.',
    current: 'Profile', settingsEntry: 'Profiles',
  },
  about: {
    title: 'About', intro: 'The libraries and assets this app is built with.', version: 'Version', license: 'License',
    libraries: 'Libraries', assets: 'Assets',
  },
};

const fr: Strings = {
  appName: 'Budget',
  nav: { transactions: 'Transactions' },
  common: {
    cancel: 'Annuler', delete: 'Supprimer', save: 'Enregistrer', add: 'Ajouter',
    expense: 'Dépense', income: 'Revenu', all: 'Tout', back: 'Retour',
    noDescription: '(sans description)', ok: 'OK', close: 'Fermer',
  },
  snackbar: {
    movedToTrash: 'Déplacée dans la corbeille', undo: 'Annuler', seriesDeleted: 'Série supprimée', restored: 'Transaction restaurée',
    deletedForever: 'Supprimée définitivement', trashEmptied: 'Corbeille vidée', added: 'Transaction ajoutée', updated: 'Transaction modifiée',
    synced: 'Calendrier synchronisé', backupExported: 'Sauvegarde exportée', backupImported: 'Sauvegarde importée',
    configExported: 'Réglages exportés', thresholdsSaved: 'Seuils enregistrés',
  },
  lock: {
    title: 'Verrouillage', help: 'Demande un code PIN à l’ouverture de l’application ou à son retour après un moment. Il masque l’écran ; les données restent stockées non chiffrées sur cet appareil.',
    enable: 'Définir un code PIN', newPin: 'Nouveau PIN (4 à 8 chiffres)', confirmPin: 'Confirmer le PIN', currentPin: 'PIN actuel', pinInvalid: 'Le PIN doit comporter 4 à 8 chiffres.',
    pinMismatch: 'Les PIN ne correspondent pas.', wrongPin: 'PIN incorrect.', unlock: 'Déverrouiller', biometric: 'Déverrouiller avec l’appareil (empreinte, visage…)',
    biometricUnlock: 'Utiliser le déverrouillage de l’appareil', biometricFailed: 'Le déverrouillage de l’appareil a échoué ou a été annulé.', change: 'Changer le PIN', disable: 'Retirer le verrouillage',
        disableConfirm: 'L’application s’ouvrira sans demander de code PIN.', lockNow: 'Verrouiller maintenant', saved: 'Verrouillage enregistré', disabled: 'Verrouillage retiré', blocked: (seconds) => `Trop de tentatives. Réessayez dans ${seconds} s.`,
  },
  selection: {
    select: 'Sélectionner', cancel: 'Annuler', selectAll: 'Tout sélectionner', none: 'Sélectionner des transactions', count: (n) => `${n} sélectionnée(s)`, delete: 'Supprimer',
    category: 'Catégorie', restore: 'Restaurer', deleteForever: 'Supprimer définitivement', chooseCategory: 'Choisir une catégorie',
    deleted: (n) => `${n} déplacée(s) dans la corbeille`, recategorised: (n) => `${n} modifiée(s)`, restored: (n) => `${n} restaurée(s)`,
    deletedForever: (n) => `${n} supprimée(s) définitivement`, deleteForeverBody: (n) => `Supprimer définitivement ${n} transaction(s) ? Cette action est irréversible.`,
  },
  frequency: { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle', bimonthly: 'Bimestrielle', quarterly: 'Trimestrielle', semiannual: 'Semestrielle', yearly: 'Annuelle' },
  trash: {
    title: 'Corbeille', empty: 'La corbeille est vide.',
    help: 'Les transactions supprimées restent ici, et dans le calendrier, jusqu’à leur restauration ou jusqu’à ce que vous vidiez la corbeille.',
    restore: 'Restaurer', deleteForever: 'Supprimer définitivement', emptyAction: 'Vider la corbeille',
    emptyBody: (count) => `${count} élément(s) seront définitivement supprimés, événements du calendrier compris.`,
    categories: 'Catégories', categoryForeverBody: (name) => `La catégorie « ${name} » sera définitivement supprimée.`,
    deleteForeverBody: (details) => `${details} sera définitivement supprimée, événement du calendrier compris.`,
    deletedOn: (date) => `Supprimée le ${date}`,
  },
  months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août',
    'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  budget: {
    balance: 'Solde', income: 'Revenus', expenses: 'Dépenses',
    searchPlaceholder: 'Rechercher...', emptyTitle: 'Aucune transaction',
    emptyText: 'Appuyez sur + pour ajouter votre première transaction du mois.',
    noMatch: 'Aucune transaction ne correspond à ces filtres.', recurringBadge: 'récurrente',
    currentMonth: 'Mois en cours',
    emptyRecurring: 'Aucune transaction récurrente ce mois-ci.', emptyOneOff: 'Aucune transaction ponctuelle ce mois-ci.',
    oneOff: 'Ponctuelles', recurring: 'Récurrentes',
    deleteTitle: 'Supprimer la transaction ?',
    deleteBody: (details) => `${details} sera déplacée dans la corbeille.`,
    deleteScopeBody: 'Cette transaction fait partie d’une série récurrente.',
    thisOccurrence: 'Cette occurrence uniquement', wholeSeries: 'Supprimer toute la série',
    categoryFilter: 'Catégorie', resetFilters: 'Réinitialiser', filters: 'Filtres',
    previousMonth: 'Mois précédent', nextMonth: 'Mois suivant', previousYear: 'Année précédente', nextYear: 'Année suivante',
  },
  levels: { critical: 'Critique', low: 'Faible', medium: 'Moyen', high: 'Confortable' },
  editor: {
    newTitle: 'Nouvelle transaction', newRecurringTitle: 'Nouvelle transaction r?currente', editTitle: 'Modifier la transaction',
    amount: 'Montant', date: 'Date', description: 'Description', category: 'Catégorie',
    repeat: 'Répéter', frequency: 'Fréquence', limited: "Limiter le nombre d'occurrences",
    occurrences: 'Occurrences', invalidAmount: 'Saisissez un montant supérieur à zéro.', invalidDate: 'Saisissez une date valide.',
    customFrequency: 'Personnalisée', interval: 'Répéter tous les', invalidInterval: 'Saisissez un nombre entre 1 et 60.',
    unit: 'Unité', units: { daily: 'Jours', weekly: 'Semaines', monthly: 'Mois', bimonthly: 'Bimestres', quarterly: 'Trimestres', semiannual: 'Semestres', yearly: 'Années' },
    installments: 'Autres dates', installmentsHelp: 'Dates supplémentaires de chaque période de la série, chacune avec son propre montant.', addInstallment: 'Ajouter une date', removeInstallment: 'Retirer cette date', invalidInstallment: 'Chaque date supplémentaire doit avoir un montant positif et tomber dans la même période que la date principale, pas avant.',
    ended: 'Terminer à un mois donné', until: 'Dernier mois', invalidUntil: 'Le dernier mois ne peut pas précéder le premier.',
    partial: 'Échelonner sur une partie de l’année', activeMonths: 'Mois par an',
    partialHelp: 'Dû chaque mois à partir de la première date pendant ce nombre de mois, puis en pause jusqu’au même mois l’année suivante.',
    invalidActiveMonths: 'Saisissez un nombre entre 1 et 11.',
    scopeTitle: 'Appliquer la modification à',
    scopeBody: 'Cette transaction fait partie d’une série récurrente.',
    occurrenceOnly: 'Cette occurrence uniquement', seriesToo: 'Toute la série',
  },
  stats: {
    title: 'Statistiques', expensesByCategory: 'Autres dépenses par catégorie',
    fromMonth: 'Du', toMonth: 'Au',
    recurringExpensesByCategory: 'Dépenses récurrentes par catégorie',
    history: 'Historique', noData: 'Rien à afficher pour le moment.',
  },
  settings: {
    title: 'Réglages', general: 'Général', language: 'Langue', currency: 'Devise',
    dateFormat: 'Format de date', amountFormat: 'Format des montants', theme: 'Thème',
    themeSystem: 'Système', themeLight: 'Clair', themeDark: 'Sombre', formatLocale: 'Selon la langue',
    thresholds: 'Seuils du solde',
    thresholdsHelp: 'Sous Faible : critique. De Faible à Moyen : faible. De Moyen à Élevé : moyen. Au-delà d’Élevé : confortable.',
    low: 'Faible (x)', medium: 'Moyen (y)', high: 'Élevé (z)',
    thresholdsOrder: 'Les seuils doivent respecter x < y < z.', thresholdsSaved: 'Seuils enregistrés',
    manage: 'Gérer',
    chooseOption: 'Choisir',
    tabs: { general: 'Général', budget: 'Budget', calendar: 'Agenda', data: 'Données' },
  },
  calendar: {
    title: 'Synchronisation du calendrier',
    help: 'Les transactions sont stock\u00e9es comme des \u00e9v\u00e9nements sur toute la journ\u00e9e dans ce calendrier CalDAV, partag\u00e9 entre bureau, mobile et web. Les mod\u00e8les de r\u00e9currence restent sur cet appareil.',
    enable: 'Activer la synchronisation', url: 'URL du calendrier', username: 'Identifiant', password: 'Mot de passe / mot de passe d\'application',
    passwordKept: 'Laisser vide pour conserver le mot de passe enregistr\u00e9',
    passwordSession: 'Ce navigateur ne peut pas conserver de secret : le mot de passe reste en m\u00e9moire pour cette session uniquement. Saisissez-le \u00e0 nouveau apr\u00e8s rechargement.',
    passwordStored: 'Le mot de passe est conserv\u00e9 chiffr\u00e9 sur cet appareil uniquement ; il n\u2019est jamais r\u00e9affich\u00e9 et ne quitte l\u2019appareil que pour joindre le serveur de calendrier.',
    proxy: 'Proxy CORS (optionnel)',
    proxyHelp: 'Adresse d\u2019un d\u00e9ploiement de budget-caldav-proxy, n\u00e9cessaire quand le serveur de calendrier n\u2019autorise pas les applications web (la plupart des h\u00e9bergeurs). Laisser vide pour un acc\u00e8s direct.',
    save: 'Enregistrer les r\u00e9glages', check: 'Tester la connexion', syncNow: 'Synchroniser maintenant',
    syncInterval: 'Synchronisation automatique (minutes)', syncIntervalHelp: 'Synchronise toutes les N minutes tant que l\'application est ouverte. 0 la d\u00e9sactive.',
    states: { disabled: 'Synchronisation d\u00e9sactiv\u00e9e', syncing: 'Synchronisation...', online: 'Connect\u00e9', offline: 'Hors ligne', error: 'Erreur' },
    never: 'jamais', lastSync: (date) => 'Derni\u00e8re synchronisation : ' + date,
    invalidConfig: 'Saisissez une URL de calendrier HTTP(S) et un identifiant.',
    passwordRequired: 'Saisissez le mot de passe du calendrier pour cette session dans les r\u00e9glages.',
    connected: 'Connexion r\u00e9ussie.',
    connectedDisabled: 'Connexion r\u00e9ussie. Activez \u00ab Activer la synchronisation \u00bb pour commencer \u00e0 \u00e9changer les transactions.',
    authError: 'Authentification refus\u00e9e. V\u00e9rifiez l\'identifiant et le mot de passe.',
    networkError: 'Calendrier inaccessible. Les changements restent sur cet appareil. V\u00e9rifiez la connexion et les r\u00e9glages CORS du serveur.',
    serverError: (message) => 'Erreur du calendrier : ' + message,
    conflicts: (count) => count + ' conflit(s) ignor\u00e9(s). Relancez la synchronisation.',
  },
  categories: {
    title: 'Catégories', newName: 'Nouvelle catégorie',
    exists: (name) => `La catégorie « ${name} » existe déjà.`,
    mustKeepOne: 'Il faut conserver au moins une catégorie.',
    deleteBody: (name) => `Supprimer « ${name} » ? Elle va dans la corbeille ; les transactions existantes la gardent, seule la liste proposée à la saisie change.`,
    rename: 'Renommer', pickIcon: "Changer l'icône",
  },
  backup: {
    title: 'Sauvegarde', help: 'Exporte le budget dans un fichier, ou le restaure depuis un export précédent.',
    export: 'Exporter une sauvegarde', import: 'Importer une sauvegarde',
    confirm: 'Remplacer toutes les données de cet appareil par cette sauvegarde ?',
    invalid: 'Ce fichier n’est pas une sauvegarde Budget reconnue.',
    corrupted: 'Le budget enregistré est illisible et a été mis de côté. L’application démarre vide ; restaurez une sauvegarde si vous en avez une.',
  },
  config: {
    help: 'Les réglages, les seuils et l’accès au calendrier (avec son mot de passe) peuvent passer sur un autre appareil dans un fichier chiffré par une phrase secrète. Rien n’est récupérable sans elle.',
    export: 'Exporter la configuration', import: 'Importer une configuration',
    passphrase: 'Phrase secrète', passphraseConfirm: 'Confirmer la phrase secrète',
    passphraseHelp: 'Au moins 8 caractères. Conservez-la précieusement : elle ne peut pas être retrouvée.',
    passphraseMismatch: 'Les deux phrases secrètes diffèrent.',
    imported: 'Configuration importée.', importedCalendar: 'Accès au calendrier appliqué.',
    importedCalendarPassword: 'Mot de passe du calendrier appliqué.',
    importedNoCalendar: 'Aucun accès au calendrier dans ce fichier.',
    bankIgnored: 'La configuration bancaire du fichier a été ignorée : cette application n’a pas d’import bancaire.',
    errors: {
      format: 'Ce fichier n’est pas une configuration Budget, ou provient d’une version plus récente.',
      passphrase: 'Phrase secrète incorrecte, ou fichier endommagé.',
      content: 'Le contenu de ce fichier n’est pas une configuration valide.',
      'weak-passphrase': 'La phrase secrète doit compter au moins 8 caractères.',
    },
    unreadable: 'Le fichier n’a pas pu être lu.',
  },
  install: {
    title: 'Installer Budget', body: 'Ajoutez l’application à votre écran d’accueil pour l’utiliser en plein écran et hors ligne.',
    install: 'Installer', dismiss: 'Non merci',
    settingsHelp: 'Installez l’application sur cet appareil pour l’utiliser en plein écran et hors ligne.',
  },
  update: {
    title: 'Mise à jour disponible', body: 'Une nouvelle version de Budget est prête.',
    apply: 'Mettre à jour', later: 'Plus tard',
  },
  onboarding: {
    label: 'Présentation', skip: 'Passer', next: 'Suivant', start: 'Commencer',
    replayTitle: 'Présentation', replayHelp: 'Revoir la présentation de l’application.', replay: 'Afficher la présentation',
    slides: [
      { title: 'Bienvenue dans Budget', body: 'Suivez vos revenus et vos dépenses mois par mois, simplement et en toute confidentialité.' },
      { title: 'Ajouter des transactions', body: 'Touchez le bouton plus pour saisir une dépense ou un revenu, avec sa date, son montant et sa catégorie.' },
      { title: 'Transactions récurrentes', body: 'Activez « Répéter » pour le loyer, le salaire ou les abonnements : ils reviennent automatiquement chaque mois, trimestre ou année.' },
      { title: 'Stats et historique', body: 'Voyez où va votre argent par catégorie et suivez votre solde au fil des mois.' },
      { title: 'Synchronisation avec votre agenda', body: 'Connectez un agenda en ligne dans les réglages pour retrouver vos transactions sur tous vos appareils.' },
    ],
  },
  schedule: {
    title: 'Échéancier', empty: 'Aucune échéance à venir. Les transactions récurrentes que vous créez apparaissent ici.',
    horizon: 'Période', months: (count) => `${count} mois`,
    deleteBody: (name) => `Supprimer la transaction récurrente « ${name} » et toutes ses échéances à venir ?`,
    income: 'Revenus', expense: 'Dépenses', net: 'Solde', total: 'Total',
  },
  profiles: {
    title: 'Profils', defaultName: 'Principal', active: 'Actif', use: 'Utiliser', add: 'Ajouter', addPlaceholder: 'Nom du nouveau profil',
    namePlaceholder: 'Nom du profil', deleteBody: (name) => `Supprimer le profil « ${name} » et toutes ses données ? Cette action est irréversible.`,
    switchBody: (name) => `Passer au profil « ${name} » ? L\u2019application se recharge.`,
    help: 'Chaque profil a ses propres transactions, catégories, transactions récurrentes, réglages et synchronisation du calendrier.',
    current: 'Profil', settingsEntry: 'Profils',
  },
  about: {
    title: 'À propos', intro: 'Les bibliothèques et ressources utilisées par cette application.', version: 'Version', license: 'Licence',
    libraries: 'Bibliothèques', assets: 'Ressources',
  },
};

export const STRINGS: Record<AppLanguage, Strings> = { en, fr };
