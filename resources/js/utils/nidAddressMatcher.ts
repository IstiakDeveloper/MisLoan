import bangladeshData from '@/data/bangladeshAddresses.json';

const DISTRICT_BN_TO_EN: Record<string, string> = {
    'ঢাকা': 'Dhaka',
    'গাজীপুর': 'Gazipur',
    'নারায়ণগঞ্জ': 'Narayanganj',
    'নারায়ণগঞ্জ': 'Narayanganj',
    'টাঙ্গাইল': 'Tangail',
    'কিশোরগঞ্জ': 'Kishoreganj',
    'মানিকগঞ্জ': 'Manikganj',
    'মুন্সীগঞ্জ': 'Munshiganj',
    'নরসিংদী': 'Narsingdi',
    'রাজবাড়ী': 'Rajbari',
    'রাজবাড়ী': 'Rajbari',
    'ফরিদপুর': 'Faridpur',
    'গোপালগঞ্জ': 'Gopalganj',
    'মাদারীপুর': 'Madaripur',
    'শরীয়তপুর': 'Shariatpur',
    'শরীয়তপুর': 'Shariatpur',
    'চট্টগ্রাম': 'Chittagong',
    'কক্সবাজার': "Cox's Bazar",
    'কুমিল্লা': 'Comilla',
    'ব্রাহ্মণবাড়িয়া': 'Brahmanbaria',
    'ব্রাহ্মণবাড়িয়া': 'Brahmanbaria',
    'চাঁদপুর': 'Chandpur',
    'লক্ষ্মীপুর': 'Lakshmipur',
    'নোয়াখালী': 'Noakhali',
    'নোয়াখালী': 'Noakhali',
    'ফেনী': 'Feni',
    'খাগড়াছড়ি': 'Khagrachhari',
    'খাগড়াছড়ি': 'Khagrachhari',
    'রাঙ্গামাটি': 'Rangamati',
    'বান্দরবান': 'Bandarban',
    'রাজশাহী': 'Rajshahi',
    'নওগাঁ': 'Naogaon',
    'চাঁপাইনবাবগঞ্জ': 'Chapainawabganj',
    'নাটোর': 'Natore',
    'পাবনা': 'Pabna',
    'বগুড়া': 'Bogra',
    'বগুড়া': 'Bogra',
    'সিরাজগঞ্জ': 'Sirajganj',
    'জয়পুরহাট': 'Joypurhat',
    'জয়পুরহাট': 'Joypurhat',
    'খুলনা': 'Khulna',
    'বাগেরহাট': 'Bagerhat',
    'সাতক্ষীরা': 'Satkhira',
    'যশোর': 'Jessore',
    'ঝিনাইদহ': 'Jhenaidah',
    'মাগুরা': 'Magura',
    'নড়াইল': 'Narail',
    'নড়াইল': 'Narail',
    'কুষ্টিয়া': 'Kushtia',
    'কুষ্টিয়া': 'Kushtia',
    'চুয়াডাঙ্গা': 'Chuadanga',
    'চুয়াডাঙ্গা': 'Chuadanga',
    'মেহেরপুর': 'Meherpur',
    'বরিশাল': 'Barisal',
    'ভোলা': 'Bhola',
    'ঝালকাঠি': 'Jhalokati',
    'পিরোজপুর': 'Pirojpur',
    'পটুয়াখালী': 'Patuakhali',
    'পটুয়াখালী': 'Patuakhali',
    'বরগুনা': 'Barguna',
    'সিলেট': 'Sylhet',
    'মৌলভীবাজার': 'Moulvibazar',
    'হবিগঞ্জ': 'Habiganj',
    'সুনামগঞ্জ': 'Sunamganj',
    'রংপুর': 'Rangpur',
    'দিনাজপুর': 'Dinajpur',
    'গাইবান্ধা': 'Gaibandha',
    'কুড়িগ্রাম': 'Kurigram',
    'কুড়িগ্রাম': 'Kurigram',
    'লালমনিরহাট': 'Lalmonirhat',
    'নীলফামারী': 'Nilphamari',
    'পঞ্চগড়': 'Panchagarh',
    'পঞ্চগড়': 'Panchagarh',
    'ঠাকুরগাঁও': 'Thakurgaon',
    'ময়মনসিংহ': 'Mymensingh',
    'ময়মনসিংহ': 'Mymensingh',
    'জামালপুর': 'Jamalpur',
    'নেত্রকোণা': 'Netrokona',
    'নেত্রকোনা': 'Netrokona',
    'শেরপুর': 'Sherpur',
};

export interface MatchedAddressResult {
    division: string;
    district: string;
    upazila: string;
    districtsList: string[];
    upazilasList: string[];
}

function norm(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchBangladeshAddress(
    districtHint?: string,
    upazilaHint?: string,
    rawAddressBn?: string
): MatchedAddressResult {
    const districtsByDivision = bangladeshData.districtsByDivision as Record<string, string[]>;
    const upazilasByDistrict = bangladeshData.upazilasByDistrict as Record<string, string[]>;

    let matchedDistrict = '';
    let matchedDivision = '';

    const combinedSearch = `${districtHint || ''} ${rawAddressBn || ''}`.trim();

    // 1. Try Bangla dictionary lookup first
    for (const [bn, en] of Object.entries(DISTRICT_BN_TO_EN)) {
        if (combinedSearch.includes(bn)) {
            matchedDistrict = en;
            break;
        }
    }

    // 2. Fallback to English match against bangladeshAddresses.json
    if (!matchedDistrict && districtHint) {
        const target = norm(districtHint);
        for (const [div, list] of Object.entries(districtsByDivision)) {
            const found = list.find((d) => norm(d) === target || norm(d).includes(target) || target.includes(norm(d)));
            if (found) {
                matchedDistrict = found;
                matchedDivision = div;
                break;
            }
        }
    }

    if (matchedDistrict && !matchedDivision) {
        for (const [div, list] of Object.entries(districtsByDivision)) {
            if (list.includes(matchedDistrict)) {
                matchedDivision = div;
                break;
            }
        }
    }

    const districtsList = matchedDivision ? districtsByDivision[matchedDivision] || [] : [];
    const upazilasList = matchedDistrict ? upazilasByDistrict[matchedDistrict] || [] : [];

    let matchedUpazila = '';
    if (upazilasList.length > 0 && upazilaHint) {
        const targetUp = norm(upazilaHint);
        if (targetUp) {
            matchedUpazila =
                upazilasList.find((u) => norm(u) === targetUp) ||
                upazilasList.find((u) => norm(u).includes(targetUp) || targetUp.includes(norm(u))) ||
                '';
        }
    }

    return {
        division: matchedDivision,
        district: matchedDistrict,
        upazila: matchedUpazila,
        districtsList,
        upazilasList,
    };
}
