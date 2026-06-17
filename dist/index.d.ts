/**
 * <input type="file"> change 이벤트에서 GPX 파일을 읽어 CZML로 변환 (브라우저 전용).
 */
export declare function asyncFromFile(ev: {
    target: {
        files: FileList;
    };
}, callback: FileCallback_2): void;

export declare interface ClockPacket {
    name: string | null;
    version: string | null;
    clock: {
        interval: string | null;
        currentTime: string | null;
        multiplier: number;
        range: string;
    };
}

export declare type CzmlData = [ClockPacket, PositionPacket];

declare type FileCallback_2 = (isError: boolean, data: ParseResult) => void;
export { FileCallback_2 as FileCallback }

/**
 * GPX 문자열을 CZML 데이터로 변환.
 */
export declare function parseGpx(data: string): ParseResult;

export declare type ParseResult = {
    isError: false;
    data: CzmlData;
} | {
    isError: true;
    errorType: string;
    data: string;
};

export declare interface PositionPacket {
    availability?: string;
    position: {
        epoch?: string;
        cartographicDegrees: number[];
    };
}

export { }
