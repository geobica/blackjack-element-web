/*
Based on UserInfoPowerLevels
*/

import React, { useState, useRef, useCallback } from "react";
import { type RoomMember, type Room } from "matrix-js-sdk/src/matrix";

import { textualPowerLevel } from "../../../../Roles";
import FlairSelector from "../../elements/FlairSelector";
import { type IRoomPermissions } from "../UserInfo";
import {
    type UserInfoPowerLevelState,
    useUserInfoPowerlevelViewModel,
} from "../../../viewmodels/right_panel/UserInfoPowerlevelViewModel";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { getFlairsForRoom, saveFlairsForRoom, type FlairMap } from "../../../../utils/flairs";
import { _t } from "../../../../languageHandler";

export const FlairsSection: React.FC<{
    user: RoomMember;
    room: Room;
    roomPermissions: IRoomPermissions;
}> = ({ user, room, roomPermissions }) => {
    return <FlairsEditor room={room} user={user} roomPermissions={roomPermissions}/>;
};

export const ExistingFlair: React.FC<{
    flairs: FlairMap;
    flairName;
    user: RoomMember;
    removeFlair;
    renameFlair;
}> = ({ flairs, flairName, user, removeFlair, renameFlair }) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(flairName);
    const inputRef = useRef<HTMLInputElement>(null);

    const commitRename = useCallback(() => {
        setEditing(false);
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== flairName) {
            renameFlair(flairName, trimmed);
        } else {
            setEditValue(flairName);
        }
    }, [editValue, flairName, renameFlair]);

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                commitRename();
            } else if (e.key === "Escape") {
                setEditValue(flairName);
                setEditing(false);
            }
        },
        [commitRename, flairName],
    );


    return (
        <div className="mx_UserInfo_existingFlair">
            <div className="mx_UserInfo_existingFlair_flairName">
                {editing?<span className="mx_UserInfo_existingFlair_editing">@<input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                        onBlur={commitRename}
                        onKeyDown={onKeyDown}
                    /></span>:<span className="mx_UserInfo_existingFlair_notEditing" style={{ color: flairs[flairName].color || "#888888", fontWeight: "bold" }}>@{flairName}</span>}
            </div>
            <button
                className="mx_UserInfo_existingFlair_rename"
                onClick={() => setEditing(true)}
                aria-label={_t("flairs|edit",{flairName:flairName})}
            >
                edit
            </button><button
                className="mx_UserInfo_existingFlair_remove"
                onClick={() => removeFlair(flairName)}
                aria-label={_t("flairs|remove",{flairName:flairName,user:user})}
            >
                ✕
            </button>
        </div>
    );
};

export const FlairsEditor: React.FC<{
    room: Room;
    user: RoomMember;
    roomPermissions: IRoomPermissions;
}> = ({ room, user, roomPermissions }) => {
    const client = useMatrixClientContext();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const flairs = getFlairsForRoom(client, room.roomId);
    // names of flairs that this user has as strings
    const userFlairs = Object.keys(flairs).filter((name) => flairs[name].users.includes(user.userId));
    // names of flairs that this user doesn't have as strings aka those that the dropdown should offer
    const availableFlairs = Object.keys(flairs).filter((name) => !flairs[name].users.includes(user.userId));

    const removeFlair = useCallback(
        async (flairName: string) => {
            const updated: FlairMap = { ...flairs };
            updated[flairName] = {
                ...updated[flairName],
                users: updated[flairName].users.filter((id) => id !== user.userId),
            };
            await saveFlairsForRoom(client, room.roomId, updated);
        },
        [client, room.roomId, flairs, user.userId],
    );

    const renameFlair = useCallback(
        async (oldFlairName: string, newFlairName: string) => {
            const updated: FlairMap = { ...flairs };
            updated[newFlairName] = flairs[oldFlairName];
            delete updated[oldFlairName];
            await saveFlairsForRoom(client, room.roomId, updated);
        },
        [client, room.roomId, flairs, user.userId],
    );

    const addFlair = useCallback(
        async (flairName: string) => {
            const updated: FlairMap = { ...flairs };
            updated[flairName] = {
                ...updated[flairName],
                users: [...updated[flairName].users, user.userId],
            };
            await saveFlairsForRoom(client, room.roomId, updated);
            setDropdownOpen(false);
        },
        [client, room.roomId, flairs, user.userId],
    );

    const createNewFlair = useCallback(
        async () => {
            var newFlairName = "New Flair";
            if(Object.keys(flairs).includes(newFlairName)){
                var appendedNum = 2;
                while(Object.keys(flairs).includes(newFlairName+" "+appendedNum)){
                    appendedNum+=1;
                }
                newFlairName = newFlairName+" "+appendedNum;
            }
            const updated: FlairMap = { ...flairs };
            updated[newFlairName] = {
                users: [user.userId],
            };
            await saveFlairsForRoom(client, room.roomId, updated);
            setDropdownOpen(false);
        },
        [client, room.roomId, flairs, user.userId],
    );

    return (
        <div className="mx_UserInfo_flairsField">
            {userFlairs.map(flairName => (
                <ExistingFlair
                    flairs={flairs}
                    flairName={flairName}
                    user={user}
                    removeFlair={removeFlair}
                    renameFlair={renameFlair}
                />))}
            {roomPermissions.canEdit?
            <div className="mx_UserInfo_flairAdder" ref={dropdownRef}>
                 {dropdownOpen?(
                    <div className="mx_UserInfo_flairDropdown">
                        {availableFlairs.map((name) => (
                            <div
                                className="mx_UserInfo_flairDropdown_row"
                                key={name}
                                onClick={() => addFlair(name)}
                                style={{ color: flairs[name].color || "#888888" }}
                            >
                                @{name}
                            </div>
                        ))}
                        <div
                            className="mx_UserInfo_flairDropdown_row"
                            key="createNewFlair"
                            onClick={() => createNewFlair()}
                            style={{ color: "#888888" }}
                        >
                            New Flair
                        </div>
                    </div>
                ):<button onClick={() => setDropdownOpen(!dropdownOpen)}>Add flair</button>}
            </div>:""}
        </div>
    );
};