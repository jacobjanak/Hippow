(this["webpackJsonpmy-app"]=this["webpackJsonpmy-app"]||[]).push([[0],{118:function(n,e,o){},119:function(n,e,o){},126:function(n,e){},128:function(n,e){},142:function(n,e){},144:function(n,e){},172:function(n,e){},174:function(n,e){},175:function(n,e){},180:function(n,e){},182:function(n,e){},201:function(n,e){},213:function(n,e){},216:function(n,e){},233:function(n,e,o){"use strict";o.r(e);var t=o(32),c=o.n(t),i=o(113),r=o.n(i),a=(o(118),o.p+"static/media/logo.6ce24c58.svg"),s=(o(119),o(7));window.test=function(){o(121);var n=o(122),e={userName:"Biswa",userId:"11223344",role:"Admin"};console.log("\n Payload: "+JSON.stringify(e));var t="Technosaviour",c="technosaviourcrypto@gmail.com",i="http://youtube.com/c/technosaviour",r={issuer:t,subject:c,audience:i,expiresIn:"24h",algorithm:"RS256"},a=n.sign(e,"-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQDdlatRjRjogo3WojgGHFHYLugdUWAY9iR3fy4arWNA1K\noS8kVw33cJibXr8bvwUAUparCwlvdbH6dvEOfou0/gCFQsHUfQrSDv+MuS\nUMAe8jzKE4qW+jK+xQU9a03GUnKHkkle+Q0pX/g6jXZ7r1/xAK5Do2kQ+X\n5xK9cipRgEKwIDAQABAoGAD+onAtVye4ic7VR7V50DF9bOnwRwNXrARcDh\nq9LWNRrRGElESYYTQ6EbatXS3MCyjjX2eMhu/aF5YhXBwkppwxg+EOmXeh\n+MzL7Zh284OuPbkglAaGhV9bb6/5CpuGb1esyPbYW+Ty2PC0GSZfIXkXs7\n6jXAu9TOBvD0ybc2YlkCQQDywg2R/7t3Q2OE2+yo382CLJdrlSLVROWKwb\n4tb2PjhY4XAwV8d1vy0RenxTB+K5Mu57uVSTHtrMK0GAtFr833AkEA6avx\n20OHo61Yela/4k5kQDtjEf1N0LfI+BcWZtxsS3jDM3i1Hp0KSu5rsCPb8a\ncJo5RO26gGVrfAsDcIXKC+bQJAZZ2XIpsitLyPpuiMOvBbzPavd4gY6Z8K\nWrfYzJoI/Q9FuBo6rKwl4BFoToD7WIUS+hpkagwWiz+6zLoX1dbOZwJACm\nH5fSSjAkLRi54PKJ8TFUeOP15h9sQzydI8zJU+upvDEKZsZc/UhT/SySDO\nxQ4G/523Y0sz/OZtSWcol/UMgQJALesy++GdvoIDLfJX5GBQpuFgFenRiR\nDabxrE9MNUZ2aPFaFp+DyAe+b4nDwuJaW2LURbr8AEZga7oQj0uYxcYw==\n-----END RSA PRIVATE KEY-----",r);console.log("\n Token: "+a);var s={issuer:t,subject:c,audience:i,maxAge:"24h",algorithms:["RS256"]},u=n.verify(a,"-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDdlatRjRjogo3WojgGHF\nHYLugdUWAY9iR3fy4arWNA1KoS8kVw33cJibXr8bvwUAUparCwlvdbH6dv\nEOfou0/gCFQsHUfQrSDv+MuSUMAe8jzKE4qW+jK+xQU9a03GUnKHkkle+Q\n0pX/g6jXZ7r1/xAK5Do2kQ+X5xK9cipRgEKwIDAQAB\n-----END PUBLIC KEY-----",s);console.log("\n Verified: "+JSON.stringify(u));var l=n.decode(a,{complete:!0});console.log("\n Docoded Header: "+JSON.stringify(l.header)),console.log("\n Docoded Payload: "+JSON.stringify(l.payload)),console.log("\n Details for the user "+e.userId+" is sent back to client")};var u=function(){return Object(s.jsx)("div",{className:"App",children:Object(s.jsxs)("header",{className:"App-header",children:[Object(s.jsx)("img",{src:a,className:"App-logo",alt:"logo"}),Object(s.jsxs)("p",{children:["Edit ",Object(s.jsx)("code",{children:"src/App.js"})," and save to reload."]}),Object(s.jsx)("a",{className:"App-link",href:"https://reactjs.org",target:"_blank",rel:"noopener noreferrer",children:"Learn React"})]})})},l=function(n){n&&n instanceof Function&&o.e(3).then(o.bind(null,234)).then((function(e){var o=e.getCLS,t=e.getFID,c=e.getFCP,i=e.getLCP,r=e.getTTFB;o(n),t(n),c(n),i(n),r(n)}))};r.a.render(Object(s.jsx)(c.a.StrictMode,{children:Object(s.jsx)(u,{})}),document.getElementById("root")),l()}},[[233,1,2]]]);
//# sourceMappingURL=main.97bbf9f7.chunk.js.map