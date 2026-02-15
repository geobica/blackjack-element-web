import { type MatrixClient } from "matrix-js-sdk/src/matrix";

import SpaceStore from "../stores/spaces/SpaceStore";

export const FLAIR_EVENT_TYPE = "m.room.flairs";

export interface FlairInfo {
    color: string | null;
    users: string[];
}

export type FlairMap = Record<string, FlairInfo>;

export function getFlairsForRoom(client: MatrixClient, roomId: string): FlairMap {
    var flairs = {};

    const parentSpaceIds = SpaceStore.instance.getKnownParents(roomId);
    for (const spaceId of parentSpaceIds) {
        const event = client.getRoom(spaceId).currentState.getStateEvents(FLAIR_EVENT_TYPE, "");
        const roomFlairs = event?.getContent()?.flairs;
        if(roomFlairs){
            for (const [name, info] of Object.entries(roomFlairs)) {
                flairs[name] = roomFlairs[name];
            }
        }
    }

    // getting flairs for the room itself
    const event = client.getRoom(roomId).currentState.getStateEvents(FLAIR_EVENT_TYPE, "");
    const roomFlairs = event?.getContent()?.flairs;
    if(roomFlairs){
        for (const [name, info] of Object.entries(roomFlairs)) {
            flairs[name] = roomFlairs[name];
        }
    }

    return flairs;
}

/**
 * Get the flair color for a user in a room.
 * Returns the color of the user's first flair alphabetically, or null if none.
 */
export function getUserFlairColor(client: MatrixClient, roomId: string, userId: string): string | null {
    const flairs = getFlairsForRoom(client, roomId);
    const names = Object.keys(flairs).sort();
    for (const name of names) {
        if (flairs[name].users.includes(userId)) {
            return flairs[name].color || null;
        }
    }
    return null;
}

/**
 * Save flairs to the room state event.
 */
export async function saveFlairsForRoom(client: MatrixClient, roomId: string, flairs: FlairMap): Promise<void> {
    await client.sendStateEvent(roomId, FLAIR_EVENT_TYPE as any, { flairs }, "");
}

/**
 * Looks for strings like @flairname in a message getting sent and formats it to show the flair in bold with color
 * and adds mentions of all members who have that flair in the message
 */
export function applyFlairsToContent(content: Record<string, any>, flairs: FlairMap): void {
    if (Object.keys(flairs).length === 0) return;

    const body: string | undefined = content.body;
    if (!body) return;

    const longestFlairFirst = Object.keys(flairs).slice().sort((a, b) => b.length - a.length);
    var mentionedUserIds = new Set<string>();
    var bodyCopy = ""+content.body;
    var formattedBody = ""+content.body;
    // or use the formatted_body if there's already some formatting
    if (content.formatted_body) {
        var bodyCopy = ""+content.formatted_body;
        var formattedBody = ""+content.formatted_body;
    }
    for(var flair_i=0;flair_i<longestFlairFirst.length;flair_i+=1){
        if(bodyCopy.includes("@"+longestFlairFirst[flair_i])){
            bodyCopy = bodyCopy.replace(new RegExp("@"+longestFlairFirst[flair_i], 'g'), "@\\");

            const flair = flairs[longestFlairFirst[flair_i]];

            const color = flair.color || "#888888";
            formattedBody = formattedBody.replace(new RegExp("@"+longestFlairFirst[flair_i], 'g'), `<b><span data-mx-color="${color}" data-flair="${longestFlairFirst[flair_i]}" style="color: ${color}">@${longestFlairFirst[flair_i]}</span></b>`);

            for (const userId of flair.users) {
                mentionedUserIds.add(userId);
            }
        }
    }

    content.format = "org.matrix.custom.html";
    content.formatted_body = formattedBody;

    // add mentioned users to m.mentions.user_ids
    if (!content["m.mentions"]) {
        content["m.mentions"] = {};
    }
    const existing: string[] = content["m.mentions"].user_ids || [];
    const allUserIds = new Set([...existing, ...mentionedUserIds]);
    content["m.mentions"].user_ids = Array.from(allUserIds);
}
