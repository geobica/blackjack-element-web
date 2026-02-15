/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.
Copyright 2015, 2016 OpenMarket Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, useEffect } from "react";
import { type MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";
import { useCreateAutoDisposedViewModel, DisambiguatedProfileView } from "@element-hq/web-shared-components";

import { DisambiguatedProfileViewModel } from "../../../viewmodels/profile/DisambiguatedProfileViewModel";
import { useRoomMemberProfile } from "../../../hooks/room/useRoomMemberProfile";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { getUserFlairColor } from "../../../utils/flairs";

interface IProps {
    mxEvent: MatrixEvent;
    onClick?(): void;
    withTooltip?: boolean;
}

export default function SenderProfile({ mxEvent, onClick, withTooltip }: IProps): JSX.Element {
    const sender = mxEvent.getSender();
    const client = useMatrixClientContext();
    const roomId = mxEvent.getRoomId();
    const flairColor = sender && roomId ? getUserFlairColor(client, roomId, sender) : null;

    const member = useRoomMemberProfile({
        userId: sender,
        member: mxEvent.sender,
    });

    const disambiguatedProfileVM = useCreateAutoDisposedViewModel(
        () =>
            new DisambiguatedProfileViewModel({
                fallbackName: sender ?? "",
                onClick,
                member,
                colored: true,
                emphasizeDisplayName: true,
                withTooltip,
                className: "mx_DisambiguatedProfile",
                colorOverride: flairColor ?? undefined,
            }),
    );

    useEffect(() => {
        disambiguatedProfileVM.setMember(sender ?? "", member);
    }, [disambiguatedProfileVM, member, sender]);
    
    useEffect(() => {
        disambiguatedProfileVM.setColorOverride(flairColor ?? undefined);
    }, [disambiguatedProfileVM, flairColor]);
    return mxEvent.getContent().msgtype !== MsgType.Emote ? (
        <DisambiguatedProfileView vm={disambiguatedProfileVM} />
    ) : (
        <></>
    );
}
