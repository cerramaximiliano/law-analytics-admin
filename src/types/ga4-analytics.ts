// ==============================|| GA4 ANALYTICS TYPES ||============================== //

export interface GA4OverviewMetrics {
	totalUsers: number;
	newUsers: number;
	sessions: number;
	pageViews: number;
	avgSessionDuration: number;
	bounceRate: number;
	engagedSessions: number;
	engagementDuration: number;
}

export interface GA4UsersTrendItem {
	date: string;
	totalUsers: number;
	newUsers: number;
	sessions: number;
}

export interface GA4TrafficSource {
	channel: string;
	sessions: number;
	users: number;
	newUsers: number;
}

export interface GA4TopPage {
	pagePath: string;
	pageViews: number;
	users: number;
	avgDuration: number;
}

export interface GA4CustomEvent {
	eventName: string;
	count: number;
	users: number;
}

export interface GA4FunnelStep {
	step: string;
	event: string;
	count: number;
	users: number;
	conversionRate: number;
}

export interface GA4CtaClick {
	ctaType: string;
	clicks: number;
	users: number;
}

export interface GA4FeatureInterest {
	feature: string;
	views: number;
	users: number;
}

export interface GA4Attribution {
	source: string;
	feature: string;
	signups: number;
	users: number;
}

export interface GA4RealtimeUsers {
	activeUsers: number;
}

export interface GA4DeviceStat {
	device: string;
	sessions: number;
	users: number;
}

export interface GA4CountryStat {
	country: string;
	sessions: number;
	users: number;
}

export interface GA4Period {
	startDate: string;
	endDate: string;
}

export interface GA4ApiResponse<T> {
	success: boolean;
	data: T;
	period?: GA4Period;
	error?: string;
	message?: string;
}

export interface GA4AllData {
	overview: GA4OverviewMetrics;
	usersTrend: GA4UsersTrendItem[];
	trafficSources: GA4TrafficSource[];
	topPages: GA4TopPage[];
	customEvents: GA4CustomEvent[];
	funnel: GA4FunnelStep[];
	ctaClicks: GA4CtaClick[];
	featureInterest: GA4FeatureInterest[];
	attribution: GA4Attribution[];
	devices: GA4DeviceStat[];
	countries: GA4CountryStat[];
	realtime: GA4RealtimeUsers;
}

export type GA4PeriodOption = "7d" | "30d" | "90d" | "365d" | "custom";

export interface GA4DateRange {
	startDate: string;
	endDate: string;
}

// ==============================|| NAVEGACIÓN TYPES ||============================== //

export interface GA4LandingPage {
	page: string;
	sessions: number;
	users: number;
	bounceRate: number;
	avgDuration: number;
}

export interface GA4ExitPage {
	page: string;
	exits: number;
	exitRate: number;
	pageViews: number;
}

export interface GA4PageFlow {
	fromPage: string;
	toPage: string;
	transitions: number;
}

export interface GA4NavigationPath {
	path: string;
	sessions: number;
	users: number;
	avgDuration: number;
}

export interface GA4PageEngagement {
	page: string;
	avgTime: number;
	scrollDepth: number;
	engagementRate: number;
	views: number;
}

export interface GA4NavigationData {
	landingPages: GA4LandingPage[];
	exitPages: GA4ExitPage[];
	navigationPaths: GA4NavigationPath[];
	pageFlow: GA4PageFlow[];
	pageEngagement: GA4PageEngagement[];
}

// ==============================|| FUNNEL TYPES ||============================== //

export interface GA4Event {
	eventName: string;
	count: number;
	users: number;
}

export interface GA4EventStatus {
	eventName: string;
	configured: boolean;
	count: number;
	users: number;
}

export interface GA4AllEventsData {
	allEvents: GA4Event[];
	expectedEvents: GA4EventStatus[];
	unexpectedEvents: GA4Event[];
	summary: {
		totalEventsFound: number;
		expectedConfigured: number;
		expectedMissing: number;
	};
}

export interface GA4FunnelStep {
	step: number;
	eventName: string;
	count: number;
	users: number;
	conversionRate: number;
	dropoff: number;
}

export interface GA4CustomFunnelData {
	steps: GA4FunnelStep[];
	summary: {
		totalSteps: number;
		startUsers: number;
		endUsers: number;
		overallConversionRate: number;
		totalDropoff: number;
	};
}

export interface GA4PredefinedFunnel {
	id: string;
	name: string;
	description: string;
	events: string[];
}

// ==============================|| EVENT EXPLORER TYPES ||============================== //

export interface GA4EventSummary {
	eventName: string;
	totalCount: number;
	totalUsers: number;
	eventsPerSession: string;
}

export interface GA4EventTrendItem {
	date: string;
	count: number;
	users: number;
}

export interface GA4DetectedParameter {
	parameterName: string;
	uniqueValues: number;
	totalCount: number;
}

export interface GA4ParameterValue {
	value: string;
	count: number;
	users: number;
}

export interface GA4EventDetails {
	summary: GA4EventSummary;
	trend: GA4EventTrendItem[];
	detectedParameters: GA4DetectedParameter[];
	parameters: Record<string, GA4ParameterValue[]>;
}
