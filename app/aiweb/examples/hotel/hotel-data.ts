export type HotelNavKey = "home" | "rooms" | "experience" | "contact";

export const hotelTheme = {
  bg: "#fcf9f4",
  surface: "#f0ede8",
  surfaceSoft: "#f6f3ee",
  surfaceStrong: "#ebe8e3",
  primary: "#173124",
  primaryLight: "#496455",
  primaryContainer: "#2d4739",
  secondary: "#785836",
  secondarySoft: "#fed2a7",
  text: "#1c1c19",
  textMuted: "#5f6661",
  outline: "#c2c8c2",
  white: "#ffffff",
};

export const hotelNav = [
  { key: "home", label: "Home", href: "/aiweb/examples/hotel" },
  { key: "rooms", label: "Rooms", href: "/aiweb/examples/hotel/pokoje" },
  { key: "experience", label: "Experience", href: "/aiweb/examples/hotel/zazitky" },
  { key: "contact", label: "Contact", href: "/aiweb/examples/hotel/kontakt" },
] as const;

export const hotelImages = {
  hero:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCmLk4DUNp1yVKtB5nMCi2s6adXAqqn9I8FSW2zh_inJC8byvBV_iR2La-MxUnFzUFd0jVWt7c0CGsKevxJUvlhGLXi_fTaSQdcnUrnQSFHe71X39E_tfiMIG2bXD6fWecipBPLIpBscdwb9C-TFmV5HBU_XO0oG_BYW85BzHxmm_CoBwBB_WsXzrCkEZ8tzCwhrTkZTIeuftGFLnK2rxtTr2xaKKLWGkMyJt0ZiEjj27fDwcSC9ZbMjvVhekOyi0mAUa6xG3nN",
  roomA:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBCrf1mcHCqjobkUyFSE-lD5lzUE6Ns39wdiwklYRZTL2RAS8j_uJh6X46KXOe6SSf2D5vJ_21xlceobRHxxMjuOTLwc_MQcDMxW-Ye05CZ9zX71pWhuawwAnFrW3afvVB0QKoc0MjW48EpxXklIrj7OiXLMVwy-6sASaPh7cQGzf6FrO_6RXSG8fh-w8dmBKbZWwOhkSz5QYEp944eICCy5s7nH_LSpzi9EsLlDEN0t5PkQj3SFI6BH6ECV9gmV1O7m_fMxhjG",
  roomB:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAk4hhGwiWceljx41rupZkugCJObJ-PUpn1vKtG_8qxWuhCiQn-0-BjUJJ8aApbIL5SVGiJPJM1F-GMqOeWBg0-fj2RvsZKFxBJ8DYxUk3siL_WFJvxAyllY2qNZbb5bQ399X30e1ubeKA5mXidcgHlb8Dm3n4_gWd2IkCswrrEbMQHv_4eBtNI1sT6vCVGFAEQ3oPS0cmU9l-NSwQDbDhmOkHNsdWsao8TLy19N_-dk8PSpVR2V9W4WoBFaeeFeKOEjQO9uquV",
  wellness:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDMvldcBfZ9wtKGuec0YxRuJa_nVnFWp9ks2LmGU8uCIHLyUHo_6ScAyjugRCNiW8WP-I2RptgjzIwp_Hvvw_uJX4vBHEM9HE1Sv4vQDvZ2V4WDILfc99Cxq_4pI-b06Vy-rjmhXR9sUS8cqMtUFkbysNTHUwtKHnwP2PDTC66HHqf-7GNE6KRMcNdZNIm12vySlElVXYRtQWWL_sNRUKE4bt-sf8Z12hSyG4e9s9DbSo60rD5Sm9G_zq2KjvgUraeWzt0y7yf_",
  breakfast:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBeabKeyW7nLtGJoJL7tevseF2WUpQmma4jW1luFmVsDQr8uoIdE_EayGtRbOBEfE1YwUwtQhdMAsmi74xsSwzb1m2Cgk8IdwlYdMNbW_5tXZQhQSvvOvvwa68KDo8SW17Rvb3ycW_tcwLWGtlGQCxlmGXxZp7eGCouQEfr0pB4JOWYQc61TufE1StSEfaMHy7T2KthI5N9PvV1DURdwJUuakWt_uN--TxBmtKZ-AJpll18dt4GMxN9We-gZRUZbga73jIgGnoE",
  hiking:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDqgzdDg_mFJUVFKJYJ7NJNfBSkZAEkfiWRQD0k4q29PPQeiAhmeTe7uiQZDNLSuVLLyBauYyxt5Z_8wi14HVRlCAOSB2gjWJekfiBNoTBFFUmHT5fVn0MsUEXXJ1kMq7Sexn5oOhKbMs6qntK2YHi4P09BhGijifchQFcjbwXaBaDyf4rufhvG-OzXncEm6N4x91HzLMx5NCe1PM8ZTUtatFyUtMcEXDfmv9fjcZQb-v-WLbXXv7yYMAw2Ba_vaHwe4ZDM63Ee",
  sunset:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA71RfUmJZvrIj4OllC-76u2wWPdA-0FDZTVkq1LvevjQ_lv50m9oqpsTMSKPq8eCEJskCx2fd3EvUMbqMQ2j0ctUDigX478ocLYKKW9J9BJZBlttUbz1lHXii72ymsufu355szJi_mLuuWWnDWtzNlccpjP9k9kt098Vqdm3qUKAJvsYr0sVpS4sxDUBS9UL77VT0Q85UTV6x4xUGTyoS0ec6fEX1SwgPvSNPanO4PVQMT20GF2u8L9iN20J1Y5cIwDYpkZpel",
  roomBorovice:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCxx1N-PcjwI7YhI1ly1RQfBBF3wgjNTgAoQymXfKA8yLcsALxFswKhP13od4ld_Zcb9SDdw1ibqv87ZfqW1Ez6h5fcmYWuuoCNo8MzdLyq15w0gGRcsaCA8YsfHnG-gw-pg3GzffL6xkgzg9MHDc0DPqxFmJIO0qR2o5oR2AJ2UPSkwE79gK9SkrUyRD68Gc9kaHrGaqLp1w0JTI1mJgprSvISzkSJenAzxMbHioo-HRrgUC67bvE4v5XXRF1ETOitbPs4jbJu",
  roomMech:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuADhj3x4B1QVUK_1TLqn__LfJIt2lUEyuuU1Jt7KJyh4Ssn_u-EkTK8MRAXdxGsJxLNmbOXMLdao7EuKf_V9ECrVBE5kuD2UuQL6bq9FOQQVYbTHMo83iX8R2luShLJrZDssjNft_PBBWwDo7yqHyxf2UYcayQys4fs1JKHGcjizpCIWwSz4vBPg0F0jR8Pa7dmmwW3epbDCIdhwwc4p5whpJOA_OG3FdFfFKcMDuyyOjr7F2jedu1zvyVd5e3rC5KRi2kmLGuw",
  roomSmrk:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBz2LmUVEWqRU4cpPQJQuc_PR_0TMGwqo4zY-9dbr3BM8Ujp7KVfk9YyeZoyE1d8G1fq6bSiKNV1ki_FAijukRJp0zI0D-8FKkWOakw1763pYo6a1vvnuTqx0F0sAB3Jxp5qxYM4J8A-QeLSdarG7VSx5lWPYUKuvLSQ7p6SokobPO1-fTs9__g1l0vXvJ5ASS7AI0FKxTolBQWuQlRNFHXaxO_I2yr5bVjxTY4rRh5OZVetlgxNA2oai5CgOh7ntlijk0_6EcA",
  forest:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBYaerBscB8b1NXXe9Ukd26Mo2PNQV51BKF9P5v7LlL4UOXuoLeII-1YuxrhBIebZq_iL1h4OUOBPk4wuSk9tB8nLFyFIS73WDdqlYOQoLhgPC9cauG7mAmdNPrEZfqT4gWvbY4HJ3yxGi9QiRtfh0h18ni_0nO9FcRHGiGBPAawo1-lfFoOAgH8ZsylnIGp45yCjpOsBsSLg7vhF-oFONSgIAruvLuXbKoNx2gxaImdOfvePWwm6DecTS0B25bz9JTWzb-ch5T",
  map:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuB15uWfaqJiNw1-OyYVU0CBOkfpKzLWeZjwYfIF1elPRGEIoBvJblnc1lS3eC8CSHwWUNHc5cV7fAz1QU1daEKk_EMFRH3SYtL0JvtyJsSA00JD8lWXQ-vO6x5hkovnXnuGG-Re4Ln9kD7swnyG6LAh1HHpoSdSoEgKPTeL5zPTfEpjNvjLUL4F0XoeNBGyKTaKd5PFTnuX1wJ6FbQOe2N5MhbD_1CvpTRDQuynkhnIKxN_00e3E_UFjrl4TzMoDtvsLYBGUiuk",
} as const;

export const hotelRooms = [
  {
    name: "Apartmán Borovice",
    capacity: "Pro 2-4 osoby",
    description:
      "Prostorný apartmán s vůní borovicového dřeva, který nabízí rovnováhu mezi moderním komfortem a šumavskou tradicí.",
    price: "3 450 Kč",
    image: hotelImages.roomBorovice,
  },
  {
    name: "Dvoulůžkový pokoj Mech",
    capacity: "Pro 2 osoby",
    description:
      "Útulný pokoj laděný do tónů lesního mechu, ideální pro páry hledající klid a regeneraci v objetí přírody.",
    price: "2 100 Kč",
    image: hotelImages.roomMech,
  },
  {
    name: "Rodinný apartmán Smrk",
    capacity: "Pro 4-6 osob",
    description:
      "Velkorysý apartmán se dvěma ložnicemi a společným prostorem navržený pro delší rodinné pobyty.",
    price: "4 800 Kč",
    image: hotelImages.roomSmrk,
  },
] as const;

export const hotelExperiences = [
  {
    title: "Lesní Wellness",
    text: "Sauna s výhledem na hřebeny, venkovní cedrové kádě a večerní klid bez městského ruchu.",
    image: hotelImages.wellness,
  },
  {
    title: "Lokální chutě",
    text: "Snídaně z farem šumavského podhůří, degustační večeře a sezónní menu podle regionu.",
    image: hotelImages.breakfast,
  },
  {
    title: "Výlety do divočiny",
    text: "Tipy na trasy, jezera, stezky i zimní programy pro hosty, kteří chtějí Šumavu opravdu zažít.",
    image: hotelImages.hiking,
  },
] as const;
