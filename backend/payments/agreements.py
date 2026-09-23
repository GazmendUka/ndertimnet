"""Versioned subscription terms; no card mandate is claimed without bank support."""
VERSION = "2026-09-20-monthly-v3"


def agreement_text(company, plan):
    return f"""MARRËVESHJE ABONIMI — NDËRTIMNET
Versioni: {VERSION}
Kompania: {company.company_name}
Plani: {plan.offers_per_month} oferta në muaj; {plan.monthly_price} EUR në muaj.

Periudha fillon me pagesën e parë të konfirmuar. Ofertat e papërdorura nuk barten.
Kreditet e kompensimit përdoren të parat për kërkesa të tjera dhe nuk skadojnë. Më pas
përdoren 25 ofertat hyrëse falas. Asnjëra nuk shtyn pagesat e një abonimi aktiv.
Ofertat shtesë paguhen veçmas: 1% e totalit të ofertuar, rrumbullakosur lart në ,95 EUR,
minimumi 2,95 EUR, maksimumi 19,95 EUR. Abonimi mund të kushtojë më shumë se pagesa për ofertë.
Për oferta me orë përdoret tarifa për orë shumëzuar me orët e vlerësuara.
Rishikimet e një oferte të përfshirë në abonim nuk konsumojnë një ofertë tjetër.
Për oferta të paguara veçmas, rritjet nën 100 EUR gjithsej nga çmimi i fundit i tarifuar
nuk sjellin tarifë shtesë. Nga 100 EUR paguhet vetëm diferenca, me maksimum 19,95 EUR
tarifë gjithsej. Uljet nuk rimbursohen. Tarifa paguhet për dërgimin, jo për pranimin.
Ndryshimet i dërgohen klientit për miratim; marrëveshja e mëparshme ruhet deri atëherë.
Kredit jepet për gabime të konfirmuara nga mbështetja. Nëse pagesa konfirmohet, por
kërkesa mbyllet përpara se oferta të dërgohet, jepet automatikisht një kredit për
një kërkesë tjetër. Ofertat e dërguara nuk marrin kredit për mungesë përgjigjeje,
anulim nga klienti apo zgjedhjen e një kompanie tjetër.

Anulimi kërkohet te faqja e pagesave të kompanisë. Afati i njoftimit është të paktën
3 muaj kalendarikë nga kërkesa. Abonimi mbaron në kufirin e parë mujor pas këtij afati;
data e saktë shfaqet pas anulimit. Pagesat vazhdojnë deri në atë datë.
Mosshfrytëzimi i ofertave nuk anulon abonimin. Pagesat e papaguara bllokojnë kuotën.

Mënyra aktuale: pagesë mujore në faqen e bankës. Kjo marrëveshje NUK aktivizon debitimin
automatik të kartës. Debitimi automatik do të kërkojë autorizim të veçantë dhe aktivizim
nga banka. Ndërtimnet nuk ruan numrin e kartës apo kodin e sigurisë.

Duke shkruar emrin dhe konfirmuar, deklaroj se jam i autorizuar të përfaqësoj kompaninë
dhe pranoj këtë marrëveshje. Kopja e nënshkruar ruhet në faqen e pagesave të kompanisë,
edhe pas anulimit. Ky konfirmim regjistron emrin, llogarinë, versionin dhe kohën; nuk është
verifikim identiteti me dokument apo nënshkrim elektronik i kualifikuar.
"""
