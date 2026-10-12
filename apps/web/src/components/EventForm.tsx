'use client';

// ========== Imports: ==========
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, MapPin, FileText, Wallet, Star, type LucideIcon } from 'lucide-react';
import { IconChip } from '@/components/ui/IconChip';
import { useCurrentUser } from '@/components/UserContext';
import { canCreateEvents } from '@/lib/rbac';
import { createEventAction, updateEventAction, getVenuesAction } from '@/lib/actions/event.actions';
import { ATTENDANCE_OPTIONS, type AttendanceRole } from '@/lib/attendance';
import type { EventType } from '@/lib/api/events';
import DatePicker from '@/components/DatePicker';
import EventPredictionPanel from '@/components/EventPredictionPanel';
import EventPlannerSandbox from '@/components/EventPlannerSandbox';
import FinanceAssigneeSelect from '@/components/FinanceAssigneeSelect';
import TimeRangeInput from '@/components/TimeRangeInput';
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput';
import ReviewCategoryEditor from '@/components/ReviewCategoryEditor';
import type { Venue } from '@/lib/api/events';
import { toSastIso } from '@/lib/format-date';
import {
    createDraft,
    hasReviewCategoryErrors,
    validateReviewCategories,
    type ReviewCategoryDraft,
    type ReviewCategoryErrors,
    type ReviewCategoryInput,
} from '@/lib/review-categories';

export interface EventFormValues {
    title:              string;
    description:        string;
    date:               string;
    time:               string;
    endTime:            string;
    location:           string;
    address:            string;
    placeId:            string;
    lat:                number | null;
    lon:                number | null;
    type:               EventType;
    intendedAttendance: AttendanceRole;
    capacity:           string;
    budget:             string;
    assignedTo:         string;
    assignedToName:     string;
    studyCenter:        string;
    sellsTickets:       boolean;
    ticketPrice:        string;
    ticketsAvailable:   string;
    allowsPlusOne:      boolean;
    reviewCategories:   ReviewCategoryInput[];
}

interface EventFormProps {
    mode:          'create' | 'edit';
    eventId?:      string;
    initialValues: EventFormValues;
    ratingCount?:  number;
}

// Hoe die backend 'n lokaal in `location` stoor (sien formatVenueLabel in events/data/venues.ts)
function venueLocation(venue: Venue): string {
    return `${venue.campus} - ${venue.label}`;
}

// Die vorm het noValidate, so die blaaier keur nie self 12.5 of 10.555 af nie. Die backend sou
// dit met 'n Engelse fout weier (heelgetal) of net so stoor (bedrag), so ons toets die teks self.
const WHOLE_NUMBER = /^\d+$/;
const RAND_AMOUNT  = /^\d+(\.\d{1,2})?$/;

// Voorstelle van die KI-panele kan breuke wees; rond af na wat die vorm self sou aanvaar
const toRandString = (value: number) => String(Math.round(value * 100) / 100);

export default function EventForm({ mode, eventId, initialValues, ratingCount = 0 }: EventFormProps) {
    const router = useRouter();
    const user = useCurrentUser();

    const [formData, setFormData] = useState({...initialValues, time: initialValues.time || '08:00', endTime: initialValues.endTime || '09:00'});

    const [apiError, setApiError]       = useState<string | null>(null);
    const [isPending, startTransition]  = useTransition();
    const [errors, setErrors]           = useState<Record<string, string>>({});

    const [reviewCategories, setReviewCategories] = useState<ReviewCategoryDraft[]>(
        () => initialValues.reviewCategories.map((category) => createDraft(category)),
    );
    const [categoryErrors, setCategoryErrors] = useState<ReviewCategoryErrors>({ rows: {} });
    const categoriesLocked = ratingCount > 0;

    // Die meeste geleenthede is by 'n kampus, so 'n nuwe geleentheid begin by "Akademia-lokaal".
    // 'n Bestaande een skakel oor sodra die lokale gelaai is en sy ligging een van hulle is.
    const [venues, setVenues] = useState<Venue[]>([]);
    const [venuesError, setVenuesError] = useState<string | null>(null);
    const [useVenue, setUseVenue] = useState(mode === 'create');
    const [venueId, setVenueId] = useState('');
    // Het die gebruiker al self aan die ligging geraak? Dan mag die lokale wat (dalk stadig) laai
    // nie meer die keuse oorskryf nie. 'n Ref, want dit verander niks op die skerm nie.
    const locationTouched = useRef(false);

    const aiPanelRef = useRef<HTMLDivElement>(null);
    const aiPanelFits = useFitsInScrollArea(aiPanelRef);

    useEffect(() => {
        getVenuesAction().then((result) => {
            if (result.error) {
                setVenuesError(result.error);
                // Sonder lokale kan net 'n eie plek gekies word
                setUseVenue(false);
                return;
            }
            const loaded = result.venues ?? [];
            setVenues(loaded);

            const existing = loaded.find((v) => venueLocation(v) === initialValues.location);
            if (existing && !locationTouched.current) {
                setUseVenue(true);
                setVenueId(existing.id);
                setFormData((prev) => ({ ...prev, studyCenter: existing.campus }));
            }
        });
        // Net een keer met die bladsy se beginwaardes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const campuses = Array.from(new Set(venues.map((v) => v.campus)));
    const campusVenues = venues.filter((v) => v.campus === formData.studyCenter);
    const selectedVenue = campusVenues.find((v) => v.id === venueId);
    // Al die lokale van 'n kampus deel een adres
    const campusAddress = campusVenues[0]?.address ?? '';

    if (mode === 'create' && !canCreateEvents(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-24">
                <AlertCircle size={48} className="text-[var(--color-red)] mb-4" />
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">Toegang Geweier</h2>
                <p className="text-[var(--color-text-subtle)] text-sm">
                    Jy het nie toestemming om geleenthede te skep nie.
                </p>
            </div>
        );
    }

    function validate() {
        const e: Record<string, string> = {};
        if (!formData.title.trim()) e.title = 'Titel is verpligtend';
        if (!formData.description.trim()) e.description = 'Beskrywing is verpligtend';
        if (!formData.date) e.date = 'Datum is verpligtend';
        if (!formData.time) e.time = 'Begintyd is verpligtend';
        if (!formData.endTime) e.endTime = 'Eindtyd is verpligtend';
        if (formData.time && formData.endTime && formData.endTime <= formData.time) {
            e.endTime = 'Eindtyd moet na begintyd wees';
        }
        if (useVenue) {
            if (!selectedVenue) e.location = "Kies asseblief 'n lokaal";
        } else {
            if (!formData.location.trim()) e.location = 'Ligging is verpligtend';
            // 'n Nuwe geleentheid moet 'n adres uit die soeklys hê. 'n Bestaande een mag sy ou adres
            // hou (ouer geleenthede het dalk geen placeId nie), maar nie sonder adres gestoor word
            // nie: ná 'n wissel na "Ander plek" is die adres leeg, en die backend weier 'n leë adres.
            if (!formData.placeId && (mode === 'create' || !formData.address.trim())) {
                e.address = 'Kies \'n geldige adres uit die soeklys';
            }
        }
        if (!WHOLE_NUMBER.test(formData.capacity) || Number(formData.capacity) <= 0)
            e.capacity = 'Kapasiteit moet \'n heelgetal groter as 0 wees';
        else if (useVenue && selectedVenue && Number(formData.capacity) > selectedVenue.maxCapacity) {
            e.capacity = `${selectedVenue.label} se kapasiteit is ${selectedVenue.maxCapacity} - kies 'n groter lokaal of verlaag die kapasiteit`;
        }
        if (!RAND_AMOUNT.test(formData.budget))
            e.budget = 'Begroting moet 0 of meer wees, met hoogstens 2 desimale';
        if (formData.sellsTickets) {
            if (!RAND_AMOUNT.test(formData.ticketPrice) || Number(formData.ticketPrice) <= 0)
                e.ticketPrice = 'Kaartjieprys moet meer as R0 wees, met hoogstens 2 desimale';
            if (!WHOLE_NUMBER.test(formData.ticketsAvailable) || Number(formData.ticketsAvailable) <= 0)
                e.ticketsAvailable = 'Aantal kaartjies moet \'n heelgetal groter as 0 wees';
        }
        return e;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const newErrors = validate();
        const newCategoryErrors = categoriesLocked ? { rows: {} } : validateReviewCategories(reviewCategories);
        if (Object.keys(newErrors).length > 0 || hasReviewCategoryErrors(newCategoryErrors)) {
            setErrors(newErrors);
            setCategoryErrors(newCategoryErrors);
            return;
        }
        setApiError(null);
        // By 'n lokaal kom die ligging en adres van die lokaal en sy kampus; die backend soek self
        // die kaartposisie op en stoor die kampus se adres presies so
        const atVenue = useVenue && selectedVenue;
        startTransition(async () => {
            const payload = {
                title:              formData.title,
                description:        formData.description,
                date:               toSastIso(formData.date, formData.time),
                endDate:            toSastIso(formData.date, formData.endTime),
                location:           atVenue ? venueLocation(selectedVenue) : formData.location,
                address:            atVenue ? selectedVenue.address : formData.address,
                placeId:            atVenue ? undefined : (formData.placeId || undefined),
                lat:                atVenue ? undefined : (formData.lat ?? undefined),
                lon:                atVenue ? undefined : (formData.lon ?? undefined),
                maxCapacity:        Number(formData.capacity),
                budget:             Number(formData.budget),
                intendedAttendance: formData.intendedAttendance,
                assignedTo:         formData.assignedTo || undefined,
                type:               formData.type,
                sellsTickets:       formData.sellsTickets,
                ticketPrice:        formData.sellsTickets ? Number(formData.ticketPrice) : undefined,
                ticketsAvailable:   formData.sellsTickets ? Number(formData.ticketsAvailable) : undefined,
                allowsPlusOne:      formData.allowsPlusOne,
                // As daar al resensies is, los ons die kategorieë heeltemal uit die payload uit.
                reviewCategories:   categoriesLocked
                    ? undefined
                    : reviewCategories.map(({ id, name }) => ({ id, name: name.trim() })),
            };

            if (mode === 'create') {
                const result = await createEventAction(payload);
                if (result.error) {
                    setApiError(result.error);
                } else {
                    router.push(`/events?created=${result.id}`);
                }
            } else {
                const err = await updateEventAction(eventId!, payload);
                if (err) {
                    setApiError(err);
                } else {
                    router.push(`/events/${eventId}`);
                }
            }
        });
    }

    function handleChange(field: string, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    function clearErrors(...fields: string[]) {
        setErrors((prev) => {
            const next = { ...prev };
            for (const field of fields) next[field] = '';
            return next;
        });
    }

    // ── Ligging ──

    function handleUseVenue(next: boolean) {
        if (next === useVenue) return;
        locationTouched.current = true;
        setUseVenue(next);
        setVenueId('');
        // Wat vir die een opsie ingevul is, geld nie vir die ander nie
        setFormData((prev) => ({ ...prev, location: '', address: '', placeId: '', lat: null, lon: null }));
        clearErrors('location', 'address');
    }

    function handleCampusChange(campus: string) {
        locationTouched.current = true;
        setFormData((prev) => ({ ...prev, studyCenter: campus }));
        setVenueId('');
        clearErrors('location');
    }

    function handleVenueChange(id: string) {
        locationTouched.current = true;
        setVenueId(id);
        const venue = campusVenues.find((v) => v.id === id);
        // Die lokaal se maksimum is 'n goeie begin; die dosent kan dit nog verlaag
        if (venue) setFormData((prev) => ({ ...prev, capacity: String(venue.maxCapacity) }));
        clearErrors('location', 'capacity');
    }

    // Sodra daar foute op die skerm is, kyk ons die hele lys weer na met elke tikslag. 'n Duplikaat-fout
    // staan dalk op 'n ander ry as die een waarin jy tik, so net daardie ry skoonmaak is nie genoeg nie.
    function handleCategoriesChange(next: ReviewCategoryDraft[]) {
        setReviewCategories(next);
        if (hasReviewCategoryErrors(categoryErrors)) setCategoryErrors(validateReviewCategories(next));
    }

    function handleApplyBudget(budget: number) {
        setFormData((prev) => ({ ...prev, budget: toRandString(budget) }));
        if (errors.budget) setErrors((prev) => ({ ...prev, budget: '' }));
    }

    function handleApplyAlternative(date: string, capacity: number) {
        setFormData((prev) => ({ ...prev, date, capacity: String(Math.round(capacity)) }));
        setErrors((prev) => ({ ...prev, date: '', capacity: '' }));
    }

    function handleApplySandbox(date: string, capacity: number, budget: number) {
        setFormData((prev) => ({ ...prev, date, capacity: String(Math.round(capacity)), budget: toRandString(budget) }));
        setErrors((prev) => ({ ...prev, date: '', capacity: '', budget: '' }));
    }

    const inputClass = (field: string) =>
        [
            'w-full bg-[var(--color-bg)] border rounded-xl px-4 py-2.5 text-sm text-[var(--color-text)]',
            'placeholder:text-[var(--color-text-subtle)] outline-none transition-colors',
            errors[field]
                ? 'border-[var(--color-red)]'
                : 'border-[var(--color-border)] focus:border-[var(--color-primary)]',
        ].join(' ');

    const labelClass = 'text-sm font-medium text-[var(--color-text)] block mb-1.5';

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <form onSubmit={handleSubmit} noValidate className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Wat, wanneer en vir wie */}
                    <FormCard icon={FileText} title="Geleentheid">
                        <FormSection title="Basiese inligting">
                            <div>
                                <label className={labelClass}>Titel</label>
                                <input
                                    type="text"
                                    placeholder="Geleentheid naam..."
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    className={inputClass('title')}
                                />
                                <FieldError message={errors.title} />
                            </div>

                            <div>
                                <label className={labelClass}>Beskrywing</label>
                                <textarea
                                    placeholder="Beskryf die geleentheid..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    rows={3}
                                    className={`${inputClass('description')} resize-none`}
                                />
                                <FieldError message={errors.description} />
                            </div>
                        </FormSection>

                        <FormSection title="Wanneer">
                            <div>
                                <label className={labelClass}>Datum</label>
                                <DatePicker
                                    value={formData.date}
                                    onChange={(date) => handleChange('date', date)}
                                    placeholder="Kies datum"
                                />
                                <FieldError message={errors.date} />
                            </div>

                            <TimeRangeInput
                                startTime={formData.time}
                                endTime={formData.endTime}
                                onStartTimeChange={(v) => handleChange('time', v)}
                                onEndTimeChange={(v) => handleChange('endTime', v)}
                                startError={errors.time}
                                endError={errors.endTime}
                            />
                        </FormSection>

                        <FormSection title="Wie kan kom">
                            <div>
                                <label className={labelClass}>Sigbaarheid (wie kan dit sien)</label>
                                <select
                                    value={formData.intendedAttendance}
                                    onChange={(e) => handleChange('intendedAttendance', e.target.value)}
                                    className={inputClass('intendedAttendance')}
                                >
                                    {ATTENDANCE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <FieldHint>Net mense met hierdie rol of hoër sien die geleentheid en kan RSVP.</FieldHint>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Kapasiteit</label>
                                    <input
                                        type="number"
                                        placeholder="bv. 50"
                                        value={formData.capacity}
                                        onChange={(e) => handleChange('capacity', e.target.value)}
                                        min="1"
                                        max={useVenue && selectedVenue ? selectedVenue.maxCapacity : undefined}
                                        className={inputClass('capacity')}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Tipe</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                        className={inputClass('type')}
                                    >
                                        <option value="public">Publiek</option>
                                        <option value="internal_student">Intern - Student</option>
                                        <option value="private">Privaat</option>
                                        <option value="department">Departement</option>
                                    </select>
                                </div>
                            </div>
                            <FieldError message={errors.capacity} />
                            <FieldHint>
                                {useVenue && selectedVenue
                                    ? `Ingevul met ${selectedVenue.label} se maksimum; jy kan dit verlaag. `
                                    : 'Kapasiteit is hoeveel mense mag RSVP. '}
                                Tipe is net &apos;n kategorie; dit bepaal nie wie dit sien nie.
                            </FieldHint>

                            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                <input
                                    type="checkbox"
                                    checked={formData.allowsPlusOne}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, allowsPlusOne: e.target.checked }))}
                                    className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                                />
                                Gaste kan &apos;n plus-een saambring
                            </label>
                            <p className="text-xs text-[var(--color-text-subtle)] -mt-2 pl-6">Die plus-een tel ook teen die kapasiteit.</p>
                        </FormSection>
                    </FormCard>

                    <div className="space-y-6">
                        <FormCard icon={MapPin} title="Ligging" description="Waar die geleentheid plaasvind.">
                            <div
                                role="radiogroup"
                                aria-label="Soort ligging"
                                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]"
                            >
                                {([
                                    [true, 'Akademia-lokaal'],
                                    [false, 'Ander plek'],
                                ] as const).map(([value, label]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        role="radio"
                                        aria-checked={useVenue === value}
                                        onClick={() => handleUseVenue(value)}
                                        disabled={value && venues.length === 0}
                                        className={`py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                            useVenue === value
                                                ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                                                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {useVenue ? (
                                <>
                                    <div className="grid grid-cols-[3fr_2fr] gap-3">
                                        <div>
                                            <label className={labelClass}>Kampus</label>
                                            <select
                                                value={formData.studyCenter}
                                                onChange={(e) => handleCampusChange(e.target.value)}
                                                className={inputClass('studyCenter')}
                                            >
                                                {!campuses.includes(formData.studyCenter) && (
                                                    <option value={formData.studyCenter}>Kies &apos;n kampus...</option>
                                                )}
                                                {campuses.map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Lokaal</label>
                                            <select
                                                value={venueId}
                                                onChange={(e) => handleVenueChange(e.target.value)}
                                                className={inputClass('location')}
                                                disabled={campusVenues.length === 0}
                                            >
                                                <option value="">Kies...</option>
                                                {campusVenues.map((v) => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.label} (maks. {v.maxCapacity})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <FieldError message={errors.location} />

                                    <div>
                                        <p className={labelClass}>Adres</p>
                                        <p className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text)]">
                                            <MapPin size={15} className="shrink-0 mt-0.5 text-[var(--color-text-subtle)]" />
                                            {campusAddress || <span className="text-[var(--color-text-subtle)]">Kies eers &apos;n kampus</span>}
                                        </p>
                                        <FieldHint>Word outomaties ingevul vir die kampus.</FieldHint>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className={labelClass}>Ligging</label>
                                        <input
                                            type="text"
                                            placeholder="Saal, gebou, ens..."
                                            value={formData.location}
                                            onChange={(e) => {
                                                locationTouched.current = true;
                                                handleChange('location', e.target.value);
                                            }}
                                            className={inputClass('location')}
                                        />
                                        <FieldError message={errors.location} />
                                    </div>

                                    <div>
                                        <label className={labelClass}>Adres</label>
                                        <AddressAutocompleteInput
                                            initialAddress={formData.address}
                                            onSelect={(details) => {
                                                locationTouched.current = true;
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    placeId: details?.placeId ?? '',
                                                    address: details?.address ?? prev.address,
                                                    lat: details?.lat ?? null,
                                                    lon: details?.lon ?? null,
                                                }));
                                                if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
                                            }}
                                            error={errors.address}
                                        />
                                        <FieldHint>Kies die adres uit die soeklys, sodat gaste dit op &apos;n kaart kan kry.</FieldHint>
                                    </div>
                                </>
                            )}
                            {venuesError && (
                                <p className="text-xs text-[var(--color-red)]">Kon nie lokale laai nie: {venuesError}</p>
                            )}
                        </FormCard>

                        <FormCard icon={Wallet} title="Geld" description="Opsioneel. Laat die begroting op 0 as daar geen geld betrokke is nie.">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Begroting (R)</label>
                                    <input
                                        type="number"
                                        placeholder="bv. 5000"
                                        value={formData.budget}
                                        onChange={(e) => handleChange('budget', e.target.value)}
                                        min="0"
                                        className={inputClass('budget')}
                                    />
                                </div>
                            </div>
                            <FieldError message={errors.budget} />

                            <div>
                                <label className={labelClass}>Toegeken aan (Finansies)</label>
                                <FinanceAssigneeSelect
                                    value={formData.assignedTo}
                                    valueName={formData.assignedToName}
                                    onChange={(id, name) =>
                                        setFormData((prev) => ({ ...prev, assignedTo: id, assignedToName: name }))
                                    }
                                />
                                <FieldHint>&apos;n Gebruiker met die Finansies-etiket wat die begroting kan sien en opvolg.</FieldHint>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                                    <input
                                        type="checkbox"
                                        checked={formData.sellsTickets}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, sellsTickets: e.target.checked }))}
                                        className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-primary)]"
                                    />
                                    Hierdie geleentheid verkoop kaartjies
                                </label>
                                <p className="text-xs text-[var(--color-text-subtle)] mt-1 pl-6">Mense betaal dan via PayFast in plaas van om gratis te RSVP.</p>
                            </div>

                            {formData.sellsTickets && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Kaartjieprys (R)</label>
                                        <input
                                            type="number"
                                            placeholder="bv. 150"
                                            value={formData.ticketPrice}
                                            onChange={(e) => handleChange('ticketPrice', e.target.value)}
                                            min="0.01"
                                            step="0.01"
                                            className={inputClass('ticketPrice')}
                                        />
                                        <FieldError message={errors.ticketPrice} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Kaartjies beskikbaar</label>
                                        <input
                                            type="number"
                                            placeholder="bv. 100"
                                            value={formData.ticketsAvailable}
                                            onChange={(e) => handleChange('ticketsAvailable', e.target.value)}
                                            min="1"
                                            className={inputClass('ticketsAvailable')}
                                        />
                                        <FieldError message={errors.ticketsAvailable} />
                                    </div>
                                </div>
                            )}
                        </FormCard>
                    </div>
                </div>

                <FormCard icon={Star} title="Resensies">
                    <ReviewCategoryEditor
                        categories={reviewCategories}
                        onChange={handleCategoriesChange}
                        errors={categoryErrors}
                        ratingCount={ratingCount}
                    />
                </FormCard>

                {apiError && (
                    <div
                        className="px-4 py-3 rounded-[12px] border text-sm font-semibold"
                        style={{
                            background:  'var(--color-bg)',
                            borderColor: 'var(--color-red)',
                            color:       'var(--color-red)',
                        }}
                    >
                        {apiError}
                    </div>
                )}

                {/* 'n Eie kaart, so breed soos die vorm. Terwyl jy afrol, bly dit onder aan die skerm
                    vas (sticky binne die vorm); aan die einde staan dit net onder die laaste kaart.
                    Die strook onder die kaart het die bladsy se agtergrond, sodat die vorm nie
                    daaronder deur sigbaar is nie. <main> se padding (p-4, sm:p-6) hou 'n sticky
                    element normaalweg soveel van die onderkant af; die negatiewe bottom laat die
                    strook tot teen die rand van die skerm strek. */}
                <div className="sticky -bottom-4 sm:-bottom-6 z-20 pb-4 bg-[var(--color-bg)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
                        <p className="text-xs text-[var(--color-text-subtle)]">
                            {Object.values(errors).some(Boolean) || hasReviewCategoryErrors(categoryErrors)
                                ? <span className="text-[var(--color-red)]">Kyk na die velde wat rooi gemerk is.</span>
                                : 'Jy kan die geleentheid later nog wysig.'}
                        </p>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {mode === 'create' ? 'Besig om te skep...' : 'Besig om te stoor...'}
                                </>
                            ) : mode === 'create' ? (
                                'Skep Geleentheid'
                            ) : (
                                'Stoor Veranderinge'
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {/* Die KI-panele bly langs die vorm sigbaar terwyl jy afrol, maar net as hulle in die
                skerm pas. 'n Hoër paneel sou vassit met sy onderkant buite die skerm, en dan kom jy
                eers daarby uit wanneer die vorm self op sy einde is. */}
            <div ref={aiPanelRef} className={`space-y-6 ${aiPanelFits ? 'xl:sticky xl:top-0' : ''}`}>
                <EventPredictionPanel
                    date={formData.date}
                    capacity={formData.capacity}
                    onApplyBudget={handleApplyBudget}
                    onApplyAlternative={handleApplyAlternative}
                />
                <EventPlannerSandbox
                    initialDate={formData.date}
                    initialCapacity={formData.capacity}
                    onApplyToForm={handleApplySandbox}
                />
            </div>
        </div>
    );
}

/**
 * Pas die element in die hoogte van die bladsy se rol-area (<main>)? Kyk weer wanneer een van die
 * twee van grootte verander, bv. as 'n voorspelling laai of die venster kleiner word. 'n Rol-balk
 * binne die paneel sou die DatePicker se oopvou-kalender afsny, daarom eerder net nie sticky nie.
 */
function useFitsInScrollArea(ref: React.RefObject<HTMLElement>): boolean {
    const [fits, setFits] = useState(true);

    useEffect(() => {
        const element = ref.current;
        const scrollArea = element?.closest('main');
        if (!element || !scrollArea) return;

        const check = () => setFits(element.offsetHeight <= scrollArea.clientHeight);
        check();
        const observer = new ResizeObserver(check);
        observer.observe(element);
        observer.observe(scrollArea);
        return () => observer.disconnect();
    }, [ref]);

    return fits;
}

// ── Klein boustene vir die vorm ──

// 'n Eie kaart vir elke deel van die vorm, sodat dit nie een lang blok is nie
function FormCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 space-y-5 min-w-0">
            <div className="flex items-start gap-3">
                <IconChip tone="primary" size="sm"><Icon size={16} /></IconChip>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
                    {description && <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{description}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-3 min-w-0">
            <div className="border-b border-[var(--color-border)] pb-1.5">
                <legend className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">{title}</legend>
                {description && <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{description}</p>}
            </div>
            {children}
        </fieldset>
    );
}

function FieldHint({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-[var(--color-text-subtle)] mt-1 leading-relaxed">{children}</p>;
}

function FieldError({ message }: { message?: string }) {
    return message ? <p className="text-xs text-[var(--color-red)] mt-1">{message}</p> : null;
}
