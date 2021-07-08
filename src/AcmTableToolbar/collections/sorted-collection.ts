import { useEffect, useState } from 'react'
import { sortedRemove, sortedReplace } from './array-utils'
import { CollectionChange, CollectionEmitter, ICollection, IOrderedCollection } from './collection'

export type SortFn<T> = (lhs: Readonly<T>, rhs: Readonly<T>) => number

export class SortedCollection<T> extends CollectionEmitter<T> implements IOrderedCollection<T> {
    private sortedItems: T[] = []

    public readonly getKey: (item: Readonly<T>) => string

    constructor(private readonly source: ICollection<T>, private sortFn?: SortFn<T>) {
        super()
        this.getKey = source.getKey
        this.handleChange = this.handleChange.bind(this)
        source.addListener('change', this.handleChange)
        if (sortFn) {
            this.source.forEach((_key, item) => this.sortedItems.push(item))
            this.setSort(sortFn)
        }
    }

    public dispose() {
        super.dispose()
        this.source.removeListener('change', this.handleChange)
    }

    public get length() {
        return this.sortedItems.length
    }

    public items(start?: number, end?: number): ReadonlyArray<Readonly<T>> {
        if (this.sortFn) return this.sortedItems.slice(start, end)
        else return []
    }

    public forEach(callback: (key: string, value: T) => void) {
        for (const item of this.sortedItems) {
            const key = this.getKey(item)
            callback(key, item)
        }
    }

    public setSort(sortFn?: SortFn<T>) {
        if (this.sortFn === sortFn) return
        this.sortFn = sortFn

        if (sortFn) {
            this.sortedItems.sort(sortFn)
            this.orderedEvent()
        }

        this.orderedEvent()
    }

    private handleChange(change: CollectionChange<T>) {
        if (this.sortFn) {
            for (const key in change.inserted) {
                const item = change.inserted[key]
                sortedReplace<T>(this.sortedItems, item, this.sortFn)
            }

            for (const key in change.removed) {
                const item = change.removed[key]
                sortedRemove<T>(this.sortedItems, item, this.sortFn)
            }
        }

        this.orderedEvent()
    }
}

export function useSortedCollection<T>(source: ICollection<T>, sortFn?: SortFn<T>): SortedCollection<T> {
    const [sorted] = useState(() => new SortedCollection<T>(source))
    useEffect(() => sorted.setSort(sortFn), [sortFn])
    useEffect(() => () => sorted.dispose(), [])
    return sorted
}
