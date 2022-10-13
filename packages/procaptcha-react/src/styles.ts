// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha-react <https://github.com/prosopo/procaptcha-react>.
//
// procaptcha-react is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha-react is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha-react.  If not, see <http://www.gnu.org/licenses/>.
import makeStyles from "@mui/styles/makeStyles";

const dot = {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
    border: "1px solid #CFCFCF",
    backgroundColor: "#FFFFFF",
}

export const useStyles = makeStyles({
    root: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%"
    },
    captchasContainer: {
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
    },
    captchasHeader: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#1976d2",
        minHeight: 80,
        padding: 20,
        width: 460,
    },
    captchasBody: {
        display: "flex",
        width: 460,
        flexWrap: "wrap",
        height: "max-content",
        paddingTop: 10,
        paddingLeft: 10,
        borderBottom: "1px solid #CFCFCF"
    },
    captchasFooter: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 80,
        paddingLeft: 20,
        paddingRight: 20
    },
    captchaItem: {
        width: "140px !important",
        borderRadius: 2,
        height: "140px !important",
        marginRight: 10,
        marginBottom: 10
    },
    captchaItemSelected: {    
        border: "4px solid #1976d2"
    },
    captchasHeaderLabel: {
        color: "#ffffff",
        fontWeight: 700
    },
    dotsContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        paddingBottom: 15,
        paddingTop: 10
    },
    dot,
    dotActive: {
        ...dot,
        backgroundColor: "#CFCFCF"
    },
});
