import { SupabaseClient, TABLE } from './SupabaseClient'
import { SnapshotWithTotalsDto } from './dto/Snapshot.dto'

export const fetchTotalsById = async (snapshotId) => {
    const { data, error } = await SupabaseClient.from(TABLE.snapshot)
        .select(`*, ${TABLE.snapshot_totals}(*)`)
        .eq(`${TABLE.snapshot}.id`, snapshotId)
        .limit(1)
        .single()

    console.debug('fetchTotalsById().data:', data)
    if (error) {
        console.error('fetchTotalsById().error:', error)
    }

    return new SnapshotWithTotalsDto(data).toObj()
}

export const fetchTotalsList = async () => {
    const { data, error } = await SupabaseClient.from(TABLE.snapshot).select(
        `*, ${TABLE.snapshot_totals}(*)`
    )

    console.debug('fetchTotalsList().data:', data)
    if (error) {
        console.error('fetchTotalsList().error:', error)
    }

    return data.map((snapshotData) =>
        new SnapshotWithTotalsDto(snapshotData).toObj()
    )
}
