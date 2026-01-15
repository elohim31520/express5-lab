import { add, isAfter } from 'date-fns'
import { normalizeDate, getZonedDate } from './date'

type DurationUnit =
	| 'years'
	| 'months'
	| 'weeks'
	| 'days'
	| 'hours'
	| 'minutes'
	| 'seconds'

interface ScheduleOptions {
	countdown: number
	gap?: number
	gapUnit?: DurationUnit
	lastTime?: string | Date
}

class Schedule {
	private lastTime: Date | null
	private timeoutID: NodeJS.Timeout | null = null
	private gap: number
	private gapUnit: DurationUnit
	private countdownSeconds: number

	constructor({
		countdown,
		gap = 24,
		gapUnit = 'hours',
		lastTime,
	}: ScheduleOptions) {
		this.lastTime = normalizeDate(lastTime ?? getZonedDate())
		this.countdownSeconds = countdown
		this.gap = gap
		this.gapUnit = gapUnit
	}

	startInterval(callback: () => void): void {
		if (typeof callback !== 'function') {
			console.error('Interval callback type is invalid')
			return
		}
		callback()
		this.timeoutID = setInterval(callback, this.countdownSeconds * 1000)
	}

	removeInterval() {
		if (this.timeoutID) {
			clearInterval(this.timeoutID)
			this.timeoutID = null
		}
	}

	updateLastTime(lastTime: string | Date): void {
		this.lastTime = normalizeDate(lastTime)
	}

	isAfterTime(): boolean {
		if (!this.lastTime) return false
		const targetTime = add(this.lastTime, { [this.gapUnit]: this.gap })
		return isAfter(getZonedDate(), targetTime)
	}
}

export default Schedule
