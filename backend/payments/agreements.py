"""Versioned monthly terms; previous signed copies are immutable."""
VERSION = "2026-10-05-standard-pro-v1"


def agreement_text(company, plan):
    return f"""MARRËVESHJE ABONIMI — NDËRTIMNET
Versioni: {VERSION}
Kompania: {company.company_name}
Plani: {plan.name}; {plan.offers_per_month} oferta në muaj.
Çmimi hyrës: {plan.monthly_price} EUR/muaj deri më 31 dhjetor 2026.
Çmimi i rregullt: {plan.regular_price} EUR/muaj nga rinovimi i parë më ose pas
1 janarit 2027 (zona kohore Europe/Stockholm), edhe për abonentët ekzistues.

Periudha fillon me pagesën e parë të konfirmuar dhe rinovohet çdo muaj.
Ofertat e papërdorura nuk barten. Nuk ka pagesë për lead, ofertë ose bisedë.
Leximi dhe përgatitja e ofertave janë falas. Kontaktet dhe biseda hapen pasi
oferta nënshkruhet dhe dërgohet. Rishikimet nuk konsumojnë një ofertë tjetër.
Kur kuota mbaron, prisni periudhën tjetër ose ndryshoni planin.
Kreditet e kompensimit dhe ofertat falas të dhëna më parë ruhen dhe përdoren
përpara kuotës. Ato nuk shtyjnë pagesat e një abonimi aktiv.

Pa afat detyrues. Anuloni në faqen e pagesave: abonimi përfundon në fund të
periudhës aktuale; nuk krijohen pagesa për periudha pas përfundimit.
Pagesat e periudhave të kaluara mbeten të detyrueshme. Pagesat e papaguara
bllokojnë kuotën. Ndryshimi i planit hyn në fuqi në periudhën tjetër;
kuota dhe çmimi i periudhës aktuale nuk ndryshojnë. Ndryshimet e ofertës
kërkojnë ende nënshkrim dhe miratim të klientit.

Pagesa mujore kryhet manualisht në faqen e bankës. Ky konfirmim nuk aktivizon
debitimin automatik të kartës. Ndërtimnet nuk ruan numrin e kartës ose CVV.
Duke shkruar emrin, deklaroj se jam i autorizuar të përfaqësoj kompaninë dhe
pranoj marrëveshjen. Kopja ruhet edhe pas anulimit. Ky është regjistrim i
pëlqimit, jo verifikim identiteti apo nënshkrim elektronik i kualifikuar.
"""
