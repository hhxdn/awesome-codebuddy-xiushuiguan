package com.xiushuiguan.controller;

import com.xiushuiguan.common.R;
import com.xiushuiguan.dto.LoginDTO;
import com.xiushuiguan.entity.User;
import com.xiushuiguan.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/login")
    public R<User> login(@RequestBody LoginDTO dto) {
        try {
            User user = userService.login(dto);
            return R.ok(user);
        } catch (Exception e) {
            return R.fail("登录失败: " + e.getMessage());
        }
    }

    @GetMapping("/info")
    public R<User> getUserInfo(@RequestParam Long userId) {
        User user = userService.getUserInfo(userId);
        if (user == null) {
            return R.fail("用户不存在");
        }
        return R.ok(user);
    }

    @PutMapping("/progress")
    public R<Boolean> updateProgress(@RequestParam Long userId, @RequestParam Integer highestLevel) {
        boolean result = userService.updateProgress(userId, highestLevel);
        return R.ok(result);
    }
}
