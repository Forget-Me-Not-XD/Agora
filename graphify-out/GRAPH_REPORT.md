# Graph Report - span4  (2026-09-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2443 nodes · 6149 edges · 111 communities (95 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 168 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c6c6e97`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102

## God Nodes (most connected - your core abstractions)
1. `useThemeColors()` - 71 edges
2. `@nestjs/common` - 62 edges
3. `Role` - 59 edges
4. `lucide-react` - 50 edges
5. `CurrentUser` - 44 edges
6. `JwtPayload` - 42 edges
7. `UsersService` - 38 edges
8. `Roles()` - 38 edges
9. `useAuthStore` - 38 edges
10. `react-native` - 36 edges

## Surprising Connections (you probably didn't know these)
- `PaymentModalProps` --references--> `Event`  [EXTRACTED]
  apps/web/src/components/PaymentModal.tsx → apps/web/src/lib/api/events.ts
- `CreateUserDto` --references--> `Role`  [EXTRACTED]
  apps/backend/src/auth/dto/create-user.dto.ts → apps/backend/src/common/enums/role.enums.ts
- `RegisterDto` --references--> `Role`  [EXTRACTED]
  apps/backend/src/auth/dto/register.dto.ts → apps/backend/src/common/enums/role.enums.ts
- `TokenPairDto` --references--> `UserResponseDto`  [EXTRACTED]
  apps/backend/src/auth/dto/token-pair.dto.ts → apps/backend/src/users/dto/user-response.dto.ts
- `Event` --references--> `EventType`  [EXTRACTED]
  apps/backend/src/events/schemas/event.schema.ts → apps/backend/src/common/enums/event-type.enum.ts

## Import Cycles
- None detected.

## Communities (111 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (47): AuthController, Body, Controller, Get, HttpCode, Post, Res, Throttle (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (51): AccountModule, Module, AnalyticsModule, Module, CalendarModule, Module, AppConfig, EventsModule (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (56): getPrediction(), PredictionResult, AssignPhotographerPayload, CreateEventPayload, EventResponse, EventType, listEvents(), UpdateEventPayload (+48 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (48): CalendarStatus, disconnectGoogleCalendar(), disconnectMicrosoftCalendar(), getCalendarStatus(), getGoogleConnectUrl(), getMicrosoftConnectUrl(), ApiClient, CREDENTIAL_CHECK_MESSAGES (+40 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (32): AuthModule, Module, RefreshTokenDto, IsString, MinLength, SsoAccountNotFoundException, SsoExceptionFilter, Catch (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (35): AuditConsumer, Injectable, InjectModel, AuditModule, Module, AuditLog, AuditLogDocument, AuditLogSchema (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (51): adminCreateUser(), CreateUserPayload, GoogleLogo(), MicrosoftLogo(), styles, BackCapableNavigation, safeGoBack(), canViewNotifications() (+43 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (35): RolesGuard, Injectable, ROLES_KEY, EventType, DEPARTMENT, INTERNAL_STUDENT, PRIVATE, PUBLIC (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (39): RsvpCalendarSyncResult, SsoProvider, GOOGLE, MICROSOFT, UserTag, FINANCE, UserTitle, DR (+31 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (46): AdminDashboard(), dynamic, fmtRand(), BudgetTrendChart(), ChartTooltip(), fmtRand(), EventsRsvpsAreaChart(), RsvpStatusBreakdown() (+38 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (37): AttendanceChart(), AttendanceItem, rateColors(), RecentBookingsTable(), STATUS_ORDER, MyBookingsTable(), UpcomingEventsCarousel(), FILTERS (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (47): advanceFillFactor(), capacityFillFactor(), capacityNoShowFactor(), clamp(), domFillFactor(), domNoShowFactor(), DOW_FILL, ENV_PATH (+39 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (41): getEvent(), cancelRsvp(), checkInRsvp(), CreateRsvpPayload, getEventRsvps(), getRsvpQrDataUri(), PopulatedEvent, registerWalkIn() (+33 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (20): AccountController, Controller, Delete, HttpCode, UseGuards, JwtPayload, JwtStrategy, Injectable (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (29): App(), styles, makeStyles(), PredictionAccuracyBarChart(), EventPickerModalProps, SelectableEvent, makeStyles(), ScreenHeader() (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (28): EventsPreview(), EventForm(), handleSubmit(), validate(), EventFormProps, EventFormValues, TimePicker(), TimePickerProps (+20 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (24): InjectModel, AutocompleteQueryDto, IsNotEmpty, IsString, MaxLength, PlaceDetailsDto, PlaceDetailsQueryDto, IsNotEmpty (+16 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (10): AnalyticsController, Controller, Get, Param, Query, Res, SkipThrottle, Throttle (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (23): getDraftPrediction(), createEvent(), getVenues(), getPlaceDetails(), PlaceDetails, PlaceSuggestion, searchPlaces(), createRsvp() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (20): DatePicker(), DatePickerProps, DateRangePicker(), DateRangePickerProps, DateRange, dayKey(), DAYS, drawnRange() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (22): BudgetData(), fmtRand(), TopSpenderRow(), attendanceColors(), fillRateOf(), InsightsPage(), isEventPast(), PerformerList() (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (33): dependencies, axios, babel-preset-expo, expo, expo-camera, expo-constants, expo-dev-client, expo-font (+25 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (25): EventsPerMonth, EventsSummary, getModelStatus(), getPredictionAccuracy(), ModelHealth, ModelStatus, PredictDraftPayload, PredictionAccuracyItem (+17 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (23): BudgetPage(), UsersPage(), UsersTable(), UserRow(), addTag(), persistTags(), removeTag(), ReadOnlyRows() (+15 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (28): description, name, private, version, class-transformer, csv-stringify, google-auth-library, helmet (+20 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (29): dependencies, amqp-connection-manager, amqplib, bcrypt, class-transformer, class-validator, csv-stringify, google-auth-library (+21 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (24): EventsSummaryResponse, RsvpSummaryResponse, AdminKpi, AdminKpis, AttendancePrediction, BudgetPerMonth, EventRevenue, EventsPerMonth (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (19): AssignPhotographerDto, IsMongoId, IsNotEmpty, IsString, MaxLength, EventResponseDto, EventsController, Body (+11 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, backgroundColor, package, permissions, enforceContrast, projectId (+20 more)

### Community 29 - "Community 29"
Cohesion: 0.17
Nodes (21): CalendarPage(), DAYS, MONTHS, EventCard(), EventCardProps, RsvpModal(), handleConfirm(), RsvpModalProps (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (18): EventPlannerSandbox(), EventPlannerSandboxProps, EventPredictionPanel(), EventPredictionPanelProps, PredictedAttendanceCard(), AttendancePredictionResult, getAttendancePredictionAction(), getDraftAttendancePredictionAction() (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (16): RsvpResponseDto, RsvpController, Body, Controller, Delete, Get, HttpCode, Param (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (20): GET(), ChangePasswordPage(), DeleteAccountSection(), handleDelete(), CreateUserForm(), handleSubmit(), EMPTY_FORM, ROLE_OPTIONS (+12 more)

### Community 33 - "Community 33"
Cohesion: 0.08
Nodes (25): axios, react, main, name, private, version, @babel/core, babel-preset-expo (+17 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (22): dynamic, GET(), noStore(), dynamic, noStore(), POST(), refreshTokenPair(), clearAuthCookies() (+14 more)

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (20): dynamic, EditEventPage(), toDateTimeInputs(), dynamic, EventDetailPage(), fmtRand(), AlreadyRsvpdTag(), AlreadyRsvpdTagProps (+12 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (20): Lottie, PaymentModal(), finishCheckout(), startCheckout(), PaymentModalProps, redirectToPayFast(), Step, Lottie (+12 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (6): CalendarSyncService, Injectable, GoogleCalendarService, Injectable, MicrosoftCalendarService, Injectable

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (21): build_model(), clean_items(), convert_to_tflite(), create_sample_weights(), create_sequences(), engineer_features(), evaluate(), fit_and_save_scaler() (+13 more)

### Community 39 - "Community 39"
Cohesion: 0.19
Nodes (20): DateRangePicker(), DateRangePickerProps, makeStyles(), withAlpha(), DateRange, dayKey(), DAYS, drawnRange() (+12 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (15): DashboardPage(), DashboardLayout(), DashboardShell(), Header(), handleLogout(), ProfileModal(), Props, Phase (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (16): InjectModel, PaymentPlatform, InitiatePaymentResponseDto, PayfastCheckoutFieldsDto, SimulatedPayfastNotifyDto, PayfastNotifyDto, PayfastNotifyResultDto, CHECKOUT_FIELD_NAMES (+8 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (16): PredictionResult, PreviewEventDto, IsDateString, IsInt, Min, EventPlannerController, Body, Controller (+8 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (16): Platform, StatePayload, CalendarStatusDto, CalendarExceptionFilter, Catch, Injectable, CALENDAR_SCOPES, FreshAccessToken (+8 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (14): CreateEventPage(), EVENT_TYPE_INFO, EventsPage(), SatisfactionItem, ExportCsvButton(), ExportType, Props, InfoModal() (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (4): RsvpService, Injectable, InjectModel, RsvpDocument

### Community 46 - "Community 46"
Cohesion: 0.15
Nodes (15): InitiatePaymentDto, IsIn, IsMongoId, IsNotEmpty, IsOptional, escapeHtml(), PaymentsController, Body (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (3): AnalyticsService, Injectable, Trend

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (19): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+11 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (15): getMyNotifications(), markNotificationRead(), NotificationItem, UserRole, MainTabParamList, Tab, TAB_CONFIG, TabConfig (+7 more)

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (15): handleSaveName(), UserRowProps, FinanceAssigneeSelect(), FinanceAssigneeSelectProps, getSessionUserId(), searchFinanceUsersAction(), syncUserCookie(), updateProfileAction() (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (17): build_counterfactual(), compute_occlusion_reasoning(), format_reason(), ndarray, reference_values(), score_sequence(), compute_budget(), engineer_features() (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (15): CalendarConnections(), handleConnectGoogle(), handleConnectMicrosoft(), handleDisconnectGoogle(), handleDisconnectMicrosoft(), Props, ProfilePage(), Props (+7 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (16): initiatePayment(), InitiatePaymentResponse, notifyPayment(), PayfastCheckoutFields, PaymentNotifyResult, SimulatedPayfastNotify, makeStyles(), PaymentModal() (+8 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (14): RegisterPage(), ROLE_OPTIONS, STUDY_CENTERS, UiRole, registerAction(), RefreshResult, AuthState, useAuthStore (+6 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (11): AccuracyPoint, PredictionAccuracyChart(), EventPickerModal(), EventPickerModalProps, SelectableEvent, accuracyTone(), PredictionAccuracyPanel(), analyze() (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (16): axios, react, react-dom, @types/node, @types/react, typescript, zustand, name (+8 more)

### Community 59 - "Community 59"
Cohesion: 0.26
Nodes (13): dynamic, expireSession(), GET(), noStore(), serverUnavailable(), ServerBusyPage(), setRefreshGuard(), isRscRequest() (+5 more)

### Community 60 - "Community 60"
Cohesion: 0.26
Nodes (13): AddressAutocompleteInput(), handleKeyDown(), handlePick(), AddressAutocompleteInputProps, getPlaceDetailsAction(), GetPlaceDetailsResult, searchPlacesAction(), SearchPlacesResult (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (10): ChartCard(), ChartCardProps, FillRateDonut(), healthOf(), TopEventsBarChart(), DosentDashboard(), StatCard(), StatCardProps (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (15): devDependencies, @nestjs/cli, @nestjs/schematics, ts-node, @types/amqplib, @types/bcrypt, @types/express, @types/ms (+7 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (15): CreateEventDto, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsMongoId (+7 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (15): IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsMongoId, IsNotEmpty (+7 more)

### Community 65 - "Community 65"
Cohesion: 0.20
Nodes (3): PaymentsService, Injectable, InjectModel

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (11): LoginPage(), NoAccountModal(), NoAccountModalProps, buildGeometry(), Geometry, SnakeFieldBorder, SnakeFieldBorderHandle, SnakeFieldBorderProps (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (8): ExportController, Controller, Get, Param, Res, UseGuards, ExportService, Injectable

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (3): InjectModel, EventsService, Injectable

### Community 69 - "Community 69"
Cohesion: 0.21
Nodes (11): ANIMATIONS, formatDate(), LoadingOverlay, makeStyles(), ResponseContext, ResponseContextProps, ResponseProvider(), ResultKind (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (12): dependencies, animejs, axios, html-to-image, lottie-react, lucide-react, next, next-themes (+4 more)

### Community 71 - "Community 71"
Cohesion: 0.27
Nodes (10): AutoRefresh(), ACTIVITY_EVENTS, isUserActive(), lastActivity, LISTENER_OPTIONS, onVisibilityChange(), recordActivity(), startListening() (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, eslint, eslint-config-next, postcss, tailwindcss, @types/animejs, @types/node (+3 more)

### Community 73 - "Community 73"
Cohesion: 0.25
Nodes (7): ACTIVITY_EVENTS, jitter(), LISTENER_OPTIONS, SessionHeartbeat(), timeoutSignal(), SessionKeepAlive(), COOKIE_REMEMBER_NAME

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (7): dynamic, MyRsvpsPage(), metadata, PopiaPage(), AttendeeDashboard(), getMyRsvps(), getSession()

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (5): MainActivity, DefaultReactActivityDelegate, Bundle, ReactActivity, ReactActivityDelegate

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (5): inter, metadata, metadata, next, next-themes

### Community 77 - "Community 77"
Cohesion: 0.36
Nodes (6): Application, MainApplication, Configuration, ReactApplication, ReactHost, ReactNativeHost

### Community 78 - "Community 78"
Cohesion: 0.28
Nodes (7): PhotographersModule, Module, PhotographerProfile, PhotographerProfileDocument, PhotographerProfileSchema, Prop, Schema

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (8): UserTitle, DR, LEC, MEV, MNR, MX, NONE, PROF

### Community 80 - "Community 80"
Cohesion: 0.46
Nodes (8): InactivityProvider(), clearCountdown(), clearIdleTimer(), handleActivity(), handleAppStateChange(), handleStillHere(), startIdleTimer(), makeStyles()

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (7): compilerOptions, module, moduleResolution, strict, extends, include, expo/tsconfig.base

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (8): UserTitle, DR, LEC, MEV, MNR, MX, NONE, PROF

### Community 83 - "Community 83"
Cohesion: 0.38
Nodes (6): findVenueByLocation(), formatVenueLabel(), slugify(), Venue, VENUE_CAPACITIES, VENUES

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (7): CreateRsvpDto, IsEmail, IsMongoId, IsNotEmpty, IsString, MaxLength, ValidateIf

### Community 85 - "Community 85"
Cohesion: 0.48
Nodes (6): ProfilePanel(), discardEdit(), handleSave(), requestCancel(), setPhase(), startEdit()

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, entryFile, $schema, sourceRoot

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (6): scripts, build, lint, start, start:dev, start:prod

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (6): scripts, android, ios, postinstall, start, web

### Community 89 - "Community 89"
Cohesion: 0.53
Nodes (4): baseOptions(), CookieWriter, setAuthCookies(), setUserCookie()

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (3): AppModule, Module, @nestjs/core

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (5): CreateWalkInDto, IsMongoId, IsNotEmpty, IsString, MaxLength

### Community 92 - "Community 92"
Cohesion: 0.40
Nodes (5): devDependencies, @babel/core, patch-package, @types/react, typescript

### Community 93 - "Community 93"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 94 - "Community 94"
Cohesion: 0.50
Nodes (3): fmt(), IncomeExpenseChart(), IncomeExpenseItem

### Community 95 - "Community 95"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

## Knowledge Gaps
- **512 isolated node(s):** `AppConfig`, `AttendanceItem`, `RsvpQrButtonProps`, `PillProps`, `CancelRsvpResult` (+507 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 911 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lucide-react` connect `Community 44` to `Community 9`, `Community 10`, `Community 15`, `Community 19`, `Community 20`, `Community 23`, `Community 29`, `Community 30`, `Community 32`, `Community 35`, `Community 36`, `Community 40`, `Community 50`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 66`, `Community 74`, `Community 76`?**
  _High betweenness centrality (0.340) - this node is a cross-community bridge._
- **Why does `typescript` connect `Community 58` to `Community 24`, `Community 33`?**
  _High betweenness centrality (0.315) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `Community 1` to `Community 4`, `Community 5`, `Community 90`, `Community 7`, `Community 8`, `Community 41`, `Community 42`, `Community 43`, `Community 13`, `Community 78`, `Community 16`, `Community 24`, `Community 26`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **What connects `AppConfig`, `AttendanceItem`, `RsvpQrButtonProps` to the rest of the system?**
  _512 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05185185185185185 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.061052631578947365 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06316590563165905 - nodes in this community are weakly interconnected._