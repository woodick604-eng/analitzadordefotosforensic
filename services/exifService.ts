
export interface ExifMetadata {
    dateTime: string | null;
    gps: { lat: number; lng: number } | null;
}

function getString(dataView: DataView, offset: number, length: number): string {
    let out = "";
    for (let i = 0; i < length; i++) {
        if (offset + i >= dataView.byteLength) break;
        const char = dataView.getUint8(offset + i);
        if (char === 0) break;
        out += String.fromCharCode(char);
    }
    return out.trim();
}

function getRational(dv: DataView, offset: number, isLE: boolean): number {
    const num = dv.getUint32(offset, isLE);
    const den = dv.getUint32(offset + 4, isLE);
    return den === 0 ? 0 : num / den;
}

function convertDMSToDD(degrees: number, minutes: number, seconds: number, direction: string): number {
    let dd = degrees + minutes / 60 + seconds / 3600;
    if (direction === "S" || direction === "W") dd *= -1;
    return dd;
}

export const getExifMetadata = (file: File): Promise<ExifMetadata> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (!buffer) return resolve({ dateTime: null, gps: null });

            try {
                const dv = new DataView(buffer);
                if (dv.getUint16(0, false) !== 0xFFD8) return resolve({ dateTime: null, gps: null });

                let dt: string | null = null;
                let gps: { lat: number, lng: number } | null = null;
                let offset = 2;

                while (offset < dv.byteLength - 2) {
                    const marker = dv.getUint16(offset, false);
                    const length = dv.getUint16(offset + 2, false);

                    if (marker === 0xFFE1 && dv.getUint32(offset + 4, false) === 0x45786966) {
                        const tiffBase = offset + 10;
                        const isLE = dv.getUint16(tiffBase, false) === 0x4949;
                        const ifd0Ptr = dv.getUint32(tiffBase + 4, isLE);

                        const numEntries = dv.getUint16(tiffBase + ifd0Ptr, isLE);
                        let exifPtr = 0;
                        let gpsPtr = 0;

                        for (let i = 0; i < numEntries; i++) {
                            const entryBase = tiffBase + ifd0Ptr + 2 + (i * 12);
                            const tag = dv.getUint16(entryBase, isLE);
                            if (tag === 0x8769) exifPtr = dv.getUint32(entryBase + 8, isLE);
                            if (tag === 0x8825) gpsPtr = dv.getUint32(entryBase + 8, isLE);
                        }

                        if (exifPtr) {
                            const subEntries = dv.getUint16(tiffBase + exifPtr, isLE);
                            for (let i = 0; i < subEntries; i++) {
                                const entryBase = tiffBase + exifPtr + 2 + (i * 12);
                                const tag = dv.getUint16(entryBase, isLE);
                                if (tag === 0x9003 || tag === 0x9004) {
                                    const valOff = dv.getUint32(entryBase + 8, isLE);
                                    dt = getString(dv, tiffBase + valOff, 20);
                                    if (tag === 0x9003) break;
                                }
                            }
                        }

                        if (gpsPtr) {
                            const gpsEntries = dv.getUint16(tiffBase + gpsPtr, isLE);
                            let latRef = "N", lonRef = "E";
                            let latDMS = [0, 0, 0], lonDMS = [0, 0, 0];

                            for (let i = 0; i < gpsEntries; i++) {
                                const entryBase = tiffBase + gpsPtr + 2 + (i * 12);
                                const tag = dv.getUint16(entryBase, isLE);
                                if (tag === 1) latRef = getString(dv, entryBase + 8, 2);
                                if (tag === 2) {
                                    const off = dv.getUint32(entryBase + 8, isLE);
                                    latDMS = [getRational(dv, tiffBase+off, isLE), getRational(dv, tiffBase+off+8, isLE), getRational(dv, tiffBase+off+16, isLE)];
                                }
                                if (tag === 3) lonRef = getString(dv, entryBase + 8, 2);
                                if (tag === 4) {
                                    const off = dv.getUint32(entryBase + 8, isLE);
                                    lonDMS = [getRational(dv, tiffBase+off, isLE), getRational(dv, tiffBase+off+8, isLE), getRational(dv, tiffBase+off+16, isLE)];
                                }
                            }
                            gps = {
                                lat: convertDMSToDD(latDMS[0], latDMS[1], latDMS[2], latRef),
                                lng: convertDMSToDD(lonDMS[0], lonDMS[1], lonDMS[2], lonRef)
                            };
                        }
                        break;
                    }
                    offset += 2 + length;
                }
                resolve({ dateTime: dt, gps });
            } catch (err) {
                resolve({ dateTime: null, gps: null });
            }
        };
        reader.onerror = () => resolve({ dateTime: null, gps: null });
        reader.readAsArrayBuffer(file);
    });
};
